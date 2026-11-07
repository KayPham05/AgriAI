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

    public AuthService(
        IUserRepository userRepository,
        IJwtTokenGenerator jwtTokenGenerator,
        IUserSessionRepository userSessionRepository,
        IUnitOfWork unitOfWork,
        IAccountEmailSender? emailSender = null,
        ILogger<AuthService>? logger = null,
        IEmailTwoFactor? twoFactor = null)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
        _userSessionRepository = userSessionRepository;
        _unitOfWork = unitOfWork;
        _emailSender = emailSender;
        _logger = logger;
        _twoFactor = twoFactor;
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
        var response = await _unitOfWork.ExecuteInTransactionAsync<AuthResponse?>(async () =>
        {
            var user = await _userRepository.GetByEmailForUpdateAsync(request.Email, cancellationToken);
            if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password.");
            if (!user.IsActive)
                throw new UnauthorizedAccessException("Tài khoản đã bị vô hiệu hóa.");
            authenticatedUser = user;
            return user.EmailTwoFactorEnabled ? null : await CreateSessionAsync(user, cancellationToken);
        }, cancellationToken);

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
            return await CreateSessionAsync(account, cancellationToken);
        }, cancellationToken);
        await SendLoginNoticeAsync(user, cancellationToken);
        return response;
    }

    private async Task<AuthResponse> CreateSessionAsync(User user, CancellationToken cancellationToken)
    {
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
