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
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(IUserRepository userRepository, IJwtTokenGenerator jwtTokenGenerator)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var exists = await _userRepository.ExistsByEmailAsync(request.Email, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"User with email '{request.Email}' already exists.");
        }

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

        var token = _jwtTokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);

        return new AuthResponse(token, userDto);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt);

        return new AuthResponse(token, userDto);
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
}
