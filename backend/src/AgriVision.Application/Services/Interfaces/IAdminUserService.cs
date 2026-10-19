using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Admin;

namespace AgriVision.Application.Services.Interfaces;

public interface IAdminUserService
{
    Task<PagedResult<AdminUserListItemDto>> GetUsersAsync(AdminUserFilterParams filterParams, CancellationToken cancellationToken = default);
    Task<AdminUserListItemDto> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AdminUserListItemDto> SetUserStatusAsync(Guid adminId, Guid targetUserId, bool isActive, CancellationToken cancellationToken = default);
    Task<AdminUserListItemDto> SetUserRoleAsync(Guid adminId, Guid targetUserId, string role, CancellationToken cancellationToken = default);
    Task<PagedResult<AdminAuditLogDto>> GetAuditLogsAsync(int pageNumber = 1, int pageSize = 20, CancellationToken cancellationToken = default);
}
