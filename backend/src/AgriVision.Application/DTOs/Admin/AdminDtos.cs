namespace AgriVision.Application.DTOs.Admin;

public record AdminSummaryDto(int UserCount, int ImageCount, int SessionCount);
public record AdminDailyActivityDto(DateOnly Date, int UserCount, int ImageCount, int SessionCount);
public record AdminActivityDto(string TimeZone, IReadOnlyList<AdminDailyActivityDto> Days);
public record AdminUserDto(Guid Id, string FullName, string Email, string Role, DateTime CreatedAt,
    bool IsLocked, DateTime? LockedAt, string? LockReason, int WarningCount);
public record AdminImageDto(Guid Id, Guid PredictionId, Guid UserId, string UserName, string UserEmail,
    string? ImageUrl, DateTime UploadedAt, DateTime ExpiresAt, string Status);
public record AdminSessionDto(Guid Id, Guid UserId, string UserName, string UserEmail,
    DateTime CreatedAt, DateTime ExpiresAt, DateTime? EndedAt, string Status);
