using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Common;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IAdminRepository
{
    Task<AdminSummaryDto> GetSummaryAsync(CancellationToken cancellationToken);
    Task<AdminActivityDto> GetActivityAsync(CancellationToken cancellationToken);
    Task<PagedResult<AdminUserDto>> GetUsersAsync(int pageNumber, int pageSize, string? q, CancellationToken cancellationToken);
    Task SetLockAsync(Guid userId, bool isLocked, string? reason, CancellationToken cancellationToken);
    Task RevokeSessionsAsync(Guid userId, CancellationToken cancellationToken);
    Task WarnUserAsync(Guid userId, Guid adminId, string message, CancellationToken cancellationToken);
    Task WarnImageAsync(Guid imageId, Guid adminId, string message, CancellationToken cancellationToken);
    Task DeleteImageAsync(Guid imageId, CancellationToken cancellationToken);
    Task<PagedResult<AdminImageDto>> GetImagesAsync(int pageNumber, int pageSize, string? q, Guid? userId, CancellationToken cancellationToken);
    Task<PagedResult<AdminSessionDto>> GetSessionsAsync(int pageNumber, int pageSize, string? q, Guid? userId, CancellationToken cancellationToken);
}
