using AgriVision.Application.DTOs.Auth;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<AuthResponse> CompleteLoginAsync(User user, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAccountAsync(User user, CancellationToken cancellationToken);
}
