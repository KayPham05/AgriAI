using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Services.Interfaces;

namespace AgriVision.Application.Services.Implementations;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;

    public UserService(
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository)
    {
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        return new UserProfileDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.IsActive,
            user.CreatedAt,
            user.UpdatedAt,
            user.EmailVerifiedAt
        );
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Họ và tên không được để trống.");
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        user.FullName = request.FullName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);

        return new UserProfileDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.IsActive,
            user.CreatedAt,
            user.UpdatedAt,
            user.EmailVerifiedAt
        );
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ArgumentException("Mật khẩu hiện tại không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("Mật khẩu mới không được để trống.");
        }

        if (request.NewPassword.Length < 6)
        {
            throw new ArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            throw new ArgumentException("Mật khẩu xác nhận không khớp.");
        }

        if (request.NewPassword == request.CurrentPassword)
        {
            throw new ArgumentException("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
        }

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        if (user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new ArgumentException("Mật khẩu hiện tại không chính xác.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user, cancellationToken);

        // Invalidate active sessions to enforce fresh login or updated security state
        await _userSessionRepository.RevokeAllSessionsByUserIdAsync(userId, cancellationToken);
    }
}
