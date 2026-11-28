using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AgriVision.Application.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IUnitOfWork _unitOfWork;

    private readonly IAccountEmailSender? _emailSender;
    private readonly ILogger<AuthService>? _logger;
    private readonly IEmailTwoFactor? _twoFactor;
    private readonly TimeProvider _clock;

    public AuthService(
        IUserRepository userRepository,
        IJwtTokenGenerator jwtTokenGenerator,
        IUserSessionRepository userSessionRepository,
        IUnitOfWork unitOfWork,
        IAccountEmailSender? emailSender = null,
        ILogger<AuthService>? logger = null,
        IEmailTwoFactor? twoFactor = null,
        TimeProvider? timeProvider = null)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
        _userSessionRepository = userSessionRepository;
        _unitOfWork = unitOfWork;
        _emailSender = emailSender;
        _logger = logger;
        _twoFactor = twoFactor;
        _clock = timeProvider ?? TimeProvider.System;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var exists = await _userRepository.ExistsByEmailAsync(request.Email, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"User with email '{request.Email}' already exists.");
        }

        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.User,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user, cancellationToken);

            var session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                RevokedAt = null
            };
            await _userSessionRepository.AddAsync(session, cancellationToken);

            var token = _jwtTokenGenerator.GenerateToken(user, session.Id);
            var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt, user.AvatarUrl);

            return new AuthResponse(token, userDto);
        }, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        User? authenticatedUser = null;
        Exception? failure = null;
        var response = await _unitOfWork.ExecuteInTransactionAsync<AuthResponse?>(async () =>
        {
            var user = await _userRepository.GetByEmailForUpdateAsync(request.Email, cancellationToken);
            if (user == null || user.PasswordHash == null)
            {
                failure = new UnauthorizedAccessException("Invalid email or password.");
                return null;
            }
            if (!user.IsActive)
                throw new UnauthorizedAccessException(BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)
                    ? "T\u00e0i kho\u1ea3n \u0111\u00e3 b\u1ecb v\u00f4 hi\u1ec7u h\u00f3a." : "Invalid email or password.");
            var now = _clock.GetUtcNow().UtcDateTime;
            if (user.LoginLockedUntil is { } until && until > now)
            {
                failure = new LoginLockedException((long)Math.Ceiling((until - now).TotalSeconds));
                return null;
            }
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.FailedLoginAttempts = 0;
                    if (user.LoginLockoutLevel < int.MaxValue) user.LoginLockoutLevel++;
                    // DateTime's representable range is the only limit on exponential growth.
                    var remainingSeconds = (DateTime.MaxValue.Ticks - now.Ticks) / TimeSpan.TicksPerSecond;
                    var seconds = Math.Min(300L << Math.Min(user.LoginLockoutLevel - 1, 31), remainingSeconds);
                    user.LoginLockedUntil = now.AddTicks(seconds * TimeSpan.TicksPerSecond);
                    failure = new LoginLockedException(seconds);
                }
                else failure = new UnauthorizedAccessException("Invalid email or password.");
                await _userRepository.UpdateAsync(user, cancellationToken);
                return null;
            }
            authenticatedUser = user;
            return user.EmailTwoFactorEnabled ? null : await CreateSessionAsync(user, cancellationToken);
        }, cancellationToken);

        // Failed-attempt updates must commit before signaling an HTTP error.
        if (failure is not null) throw failure;

        // Persist the challenge after the credential transaction commits; the 202 signal throws.
        if (response is null)
            return await LoginAccountAsync(authenticatedUser!, cancellationToken);
        await SendLoginNoticeAsync(authenticatedUser!, cancellationToken);
        return response;
    }

    public async Task<AuthResponse> LoginAccountAsync(User user, CancellationToken cancellationToken)
    {
        if (!user.IsActive)
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.EmailTwoFactorEnabled)
        {
            var twoFactor = _twoFactor ?? throw new InvalidOperationException("Dịch vụ xác minh chưa được cấu hình.");
            var challenge = await twoFactor.IssueAsync(user, "TwoFactorLogin", cancellationToken);
            throw new TwoFactorRequiredException(challenge);
        }

        return await CompleteLoginAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> CompleteLoginAsync(User user, CancellationToken cancellationToken)
    {
        var response = await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var account = await _userRepository.GetByEmailForUpdateAsync(user.Email, cancellationToken);
            if (account is not { IsActive: true })
                throw new UnauthorizedAccessException("Invalid email or password.");
            var now = _clock.GetUtcNow().UtcDateTime;
            if (account.LoginLockedUntil is { } until && until > now)
                throw new LoginLockedException((long)Math.Ceiling((until - now).TotalSeconds));
            return await CreateSessionAsync(account, cancellationToken);
        }, cancellationToken);
        await SendLoginNoticeAsync(user, cancellationToken);
        return response;
    }

    private async Task<AuthResponse> CreateSessionAsync(User user, CancellationToken cancellationToken)
    {
        if (user.FailedLoginAttempts != 0 || user.LoginLockoutLevel != 0 || user.LoginLockedUntil is not null)
        {
            user.FailedLoginAttempts = 0;
            user.LoginLockoutLevel = 0;
            user.LoginLockedUntil = null;
            await _userRepository.UpdateAsync(user, cancellationToken);
        }
        var session = new UserSession
        {
            Id = Guid.NewGuid(), UserId = user.Id,
            CreatedAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        await _userSessionRepository.AddAsync(session, cancellationToken);
        var token = _jwtTokenGenerator.GenerateToken(user, session.Id);
        var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt, user.AvatarUrl);
        return new AuthResponse(token, userDto);
    }

    private async Task SendLoginNoticeAsync(User user, CancellationToken cancellationToken)
    {
        if (_emailSender is not null)
        {
            try
            {
                await _emailSender.SendAsync(user.Email, "Thông báo đăng nhập AgriAI",
                    $"Tài khoản của bạn vừa đăng nhập vào AgriAI lúc {DateTimeOffset.UtcNow:u}. " +
                    "Nếu bạn không thực hiện đăng nhập này, hãy đổi mật khẩu.", cancellationToken);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                _logger?.LogWarning("Login notification failed for user {UserId} ({ErrorType}).",
                    user.Id, exception.GetType().Name);
            }
        }

    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        return new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt, user.AvatarUrl);
    }

    public async Task LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        await _userSessionRepository.RevokeSessionAsync(userId, sessionId, cancellationToken);
    }
}
