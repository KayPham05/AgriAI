namespace AgriVision.Application.DTOs.Admin;

public record AdminUserListItemDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime? EmailVerifiedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int PredictionCount
);

public record AdminUserFilterParams(
    string? Search = null,
    string? Role = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 10
);

public record UpdateUserStatusRequest(
    bool IsActive
);

public record UpdateUserRoleRequest(
    string Role
);

public record AdminAuditLogDto(
    Guid Id,
    Guid? ActorUserId,
    string? ActorEmail,
    Guid? TargetUserId,
    string? TargetEmail,
    string Action,
    DateTime OccurredAt
);
