using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;

namespace AgriVision.Application.Services.Implementations;

public class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IAdminAuditLogRepository _auditLogRepository;
    private readonly IPredictionRepository _predictionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserNotificationRepository _notifications;
    private readonly ISessionNoticePublisher _sessionNotices;

    public AdminUserService(
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository,
        IAdminAuditLogRepository auditLogRepository,
        IPredictionRepository predictionRepository,
        IUnitOfWork unitOfWork, IUserNotificationRepository notifications,
        ISessionNoticePublisher sessionNotices)
    {
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
        _auditLogRepository = auditLogRepository;
        _predictionRepository = predictionRepository;
        _unitOfWork = unitOfWork;
        _notifications = notifications;
        _sessionNotices = sessionNotices;
    }

    public async Task<PagedResult<AdminUserListItemDto>> GetUsersAsync(AdminUserFilterParams filterParams, CancellationToken cancellationToken = default)
    {
        if (filterParams.PageNumber is < 1 or > 1000000 || filterParams.PageSize is < 1 or > 100 || filterParams.Search?.Length > 150)
        {
            throw new ArgumentException("Page number and page size must be positive.");
        }

        var (users, totalCount) = await _userRepository.GetPagedUsersAsync(
            filterParams.Search,
            filterParams.Role,
            filterParams.IsActive,
            filterParams.PageNumber,
            filterParams.PageSize,
            cancellationToken);

        var dtos = users.Select(u => MapToDto(u, u.Predictions?.Count ?? 0)).ToList();

        return new PagedResult<AdminUserListItemDto>(dtos, filterParams.PageNumber, filterParams.PageSize, totalCount);
    }

    public async Task<AdminUserListItemDto> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{userId}' not found.");
        }

        var predictionCount = await _predictionRepository.GetCountByUserIdAsync(userId, cancellationToken);
        return MapToDto(user, predictionCount);
    }

    public async Task<AdminUserListItemDto> SetUserStatusAsync(Guid adminId, Guid targetUserId, bool isActive, CancellationToken cancellationToken = default, string? reason = null)
    {
        if (reason?.Trim().Length > 500) throw new ArgumentException("Lý do khóa không được vượt quá 500 ký tự.");
        if (adminId == targetUserId && !isActive)
        {
            throw new InvalidOperationException("Admin cannot deactivate their own account.");
        }

        User user = null!;
        Guid[] revokedSessionIds = [];
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                // Serialize status transitions with login and other administrators.
                user = await _userRepository.GetByIdForUpdateAsync(targetUserId, cancellationToken)
                    ?? throw new KeyNotFoundException($"User with ID '{targetUserId}' not found.");
                if (user.IsActive == isActive) return;
                user.IsActive = isActive;
                user.LockReason = isActive ? null : reason?.Trim();
                user.LockedAt = isActive ? null : DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user, cancellationToken);

                if (!isActive)
                {
                    revokedSessionIds = (await _userSessionRepository.GetActiveSessionsByUserIdAsync(targetUserId, cancellationToken))
                        .Select(session => session.Id).ToArray();
                    await _userSessionRepository.RevokeAllByAdminAsync(targetUserId, cancellationToken);
                }
                else
                    await _notifications.AddAsync(new UserNotification { UserId = targetUserId, ActorUserId = adminId,
                        Kind = "AccountRestored", Message = "Tài khoản của bạn đã được khôi phục. Bạn có thể sử dụng các chức năng trở lại." }, cancellationToken);

                await _auditLogRepository.AddAsync(new AdminAuditLog
                {
                    Id = Guid.NewGuid(),
                    ActorUserId = adminId,
                    TargetUserId = targetUserId,
                    Action = isActive ? "ActivateUser" : "DeactivateUser",
                    OccurredAt = DateTime.UtcNow
                }, cancellationToken);
            }, cancellationToken);

        if (revokedSessionIds.Length > 0)
            await _sessionNotices.PublishAsync(revokedSessionIds, SessionNotice.Locked(user.LockReason));
        var predictionCount = await _predictionRepository.GetCountByUserIdAsync(targetUserId, cancellationToken);
        return MapToDto(user, predictionCount);
    }

    public async Task<AdminUserListItemDto> SetUserRoleAsync(Guid adminId, Guid targetUserId, string role, CancellationToken cancellationToken = default)
    {
        if (role != UserRole.User && role != UserRole.Admin)
        {
            throw new ArgumentException("Vai trò không hợp lệ. Chỉ chấp nhận 'User' hoặc 'Admin'.");
        }

        if (adminId == targetUserId && role != UserRole.Admin)
        {
            throw new InvalidOperationException("Admin cannot remove their own admin role.");
        }

        var user = await _userRepository.GetByIdAsync(targetUserId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{targetUserId}' not found.");
        }

        if (user.Role != role)
        {
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                user.Role = role;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user, cancellationToken);

                // Invalidate active sessions to enforce role change immediately
                await _userSessionRepository.RevokeAllSessionsByUserIdAsync(targetUserId, cancellationToken);

                await _auditLogRepository.AddAsync(new AdminAuditLog
                {
                    Id = Guid.NewGuid(),
                    ActorUserId = adminId,
                    TargetUserId = targetUserId,
                    Action = $"ChangeRoleTo_{role}",
                    OccurredAt = DateTime.UtcNow
                }, cancellationToken);
            }, cancellationToken);
        }

        var predictionCount = await _predictionRepository.GetCountByUserIdAsync(targetUserId, cancellationToken);
        return MapToDto(user, predictionCount);
    }

    public async Task<PagedResult<AdminAuditLogDto>> GetAuditLogsAsync(int pageNumber = 1, int pageSize = 20, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1 || pageSize < 1)
        {
            throw new ArgumentException("Page number and page size must be positive.");
        }

        var (logs, totalCount) = await _auditLogRepository.GetPagedLogsAsync(pageNumber, pageSize, cancellationToken);

        var dtos = logs.Select(l => new AdminAuditLogDto(
            l.Id,
            l.ActorUserId,
            l.ActorUser?.Email,
            l.TargetUserId,
            l.TargetUser?.Email,
            l.Action,
            l.OccurredAt
        )).ToList();

        return new PagedResult<AdminAuditLogDto>(dtos, pageNumber, pageSize, totalCount);
    }

    private static AdminUserListItemDto MapToDto(User u, int predictionCount) => new(
        u.Id,
        u.FullName,
        u.Email,
        u.Role,
        u.IsActive,
        u.EmailVerifiedAt,
        u.CreatedAt,
        u.UpdatedAt,
        predictionCount,
        u.LockReason,
        u.LockedAt
    );
}
