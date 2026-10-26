namespace AgriVision.Application.DTOs.User;

public record UserProfileDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? EmailVerifiedAt,
    string? AvatarUrl = null
);

public record UpdateProfileRequest(string FullName);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string ConfirmPassword
);
