using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;

namespace AgriVision.Application.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository userRepository,
        IJwtTokenGenerator jwtTokenGenerator,
        IUserSessionRepository userSessionRepository,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
        _userSessionRepository = userSessionRepository;
        _unitOfWork = unitOfWork;
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
            var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);

            return new AuthResponse(token, userDto);
        }, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var user = await _userRepository.GetByEmailForUpdateAsync(request.Email, cancellationToken);
            if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Tài khoản đã bị vô hiệu hóa.");
            }

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
            var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);

            return new AuthResponse(token, userDto);
        }, cancellationToken);
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        return new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);
    }

    public async Task LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        await _userSessionRepository.RevokeSessionAsync(userId, sessionId, cancellationToken);
    }
}
