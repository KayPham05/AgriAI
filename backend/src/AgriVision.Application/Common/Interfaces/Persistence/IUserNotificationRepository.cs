using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IUserNotificationRepository
{
    Task AddAsync(UserNotification notification, CancellationToken cancellationToken = default);
}
