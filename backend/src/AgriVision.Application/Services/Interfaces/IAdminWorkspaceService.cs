using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Common;

namespace AgriVision.Application.Services.Interfaces;

public interface IAdminWorkspaceService
{
    Task<PagedResult<AdminImageDto>> GetImagesAsync(AdminPageQuery query, CancellationToken cancellationToken);
    Task<PagedResult<AdminSessionDto>> GetSessionsAsync(AdminPageQuery query, CancellationToken cancellationToken);
    Task WarnAsync(Guid actorId, Guid? userId, Guid? imageId, string message, CancellationToken cancellationToken);
    Task LogoutAllAsync(Guid actorId, Guid userId, CancellationToken cancellationToken);
    Task<PagedResult<UserNotificationDto>> GetNotificationsAsync(Guid userId, AdminPageQuery query, CancellationToken cancellationToken);
    Task UpdateNotificationAsync(Guid userId, Guid id, bool dismiss, CancellationToken cancellationToken);
    Task UpdateAllNotificationsAsync(Guid userId, bool dismiss, CancellationToken cancellationToken);
}
