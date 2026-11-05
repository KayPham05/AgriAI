using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public sealed class UserNotificationRepository(AppDbContext db) : IUserNotificationRepository
{
    public async Task AddAsync(UserNotification notification, CancellationToken cancellationToken = default)
    {
        db.UserNotifications.Add(notification);
        await db.SaveChangesAsync(cancellationToken);
    }
}
