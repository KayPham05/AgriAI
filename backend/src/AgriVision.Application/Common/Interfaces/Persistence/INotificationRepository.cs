using AgriVision.Application.DTOs.Auth;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface INotificationRepository
{
    Task<IReadOnlyList<NotificationDto>> GetAsync(Guid userId, CancellationToken cancellationToken);
    Task MarkReadAsync(Guid userId, CancellationToken cancellationToken);
    Task DismissAsync(Guid userId, CancellationToken cancellationToken);
}
