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

    public AdminUserService(
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository,
        IAdminAuditLogRepository auditLogRepository,
        IPredictionRepository predictionRepository)
    {
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
        _auditLogRepository = auditLogRepository;
        _predictionRepository = predictionRepository;
    }

    public async Task<PagedResult<AdminUserListItemDto>> GetUsersAsync(AdminUserFilterParams filterParams, CancellationToken cancellationToken = default)
    {
        if (filterParams.PageNumber < 1 || filterParams.PageSize < 1)
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

    public async Task<AdminUserListItemDto> SetUserStatusAsync(Guid adminId, Guid targetUserId, bool isActive, CancellationToken cancellationToken = default)
    {
        if (adminId == targetUserId && !isActive)
        {
            throw new InvalidOperationException("Admin cannot deactivate their own account.");
        }

        var user = await _userRepository.GetByIdAsync(targetUserId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID '{targetUserId}' not found.");
        }

        if (user.IsActive != isActive)
        {
            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user, cancellationToken);

            if (!isActive)
            {
                await _userSessionRepository.RevokeAllSessionsByUserIdAsync(targetUserId, cancellationToken);
            }

            await _auditLogRepository.AddAsync(new AdminAuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = adminId,
                TargetUserId = targetUserId,
                Action = isActive ? "ActivateUser" : "DeactivateUser",
                OccurredAt = DateTime.UtcNow
            }, cancellationToken);
        }

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
        predictionCount
    );
}
