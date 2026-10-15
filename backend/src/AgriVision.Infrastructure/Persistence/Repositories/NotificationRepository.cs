using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class NotificationRepository(AppDbContext context) : INotificationRepository
{
    public async Task<IReadOnlyList<NotificationDto>> GetAsync(Guid userId, CancellationToken cancellationToken) =>
        await context.UserNotifications.AsNoTracking().Where(item => item.UserId == userId && item.DismissedAt == null)
            .OrderByDescending(item => item.CreatedAt).ThenBy(item => item.Id)
            .Select(item => new NotificationDto(item.Id, item.Title, item.Message, item.CreatedAt, item.ReadAt, item.ImageId))
            .ToListAsync(cancellationToken);

    public async Task MarkReadAsync(Guid userId, CancellationToken cancellationToken) =>
        await context.UserNotifications.Where(item => item.UserId == userId && item.ReadAt == null && item.DismissedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ReadAt, DateTime.UtcNow), cancellationToken);

    public async Task DismissAsync(Guid userId, CancellationToken cancellationToken) =>
        await context.UserNotifications.Where(item => item.UserId == userId && item.DismissedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.DismissedAt, DateTime.UtcNow), cancellationToken);
}
