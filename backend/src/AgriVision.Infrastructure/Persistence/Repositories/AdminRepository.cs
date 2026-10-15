using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Common;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class AdminRepository(AppDbContext context, IImageStorage storage) : IAdminRepository
{
    private const string ActivityTimeZone = "Asia/Ho_Chi_Minh";
    private const int VietnamUtcOffsetHours = 7;
    private const int ActivityDays = 7;

    public async Task<AdminActivityDto> GetActivityAsync(CancellationToken cancellationToken)
    {
        var firstLocalDay = DateTime.UtcNow.AddHours(VietnamUtcOffsetHours).Date.AddDays(1 - ActivityDays);
        var startUtc = DateTime.SpecifyKind(firstLocalDay.AddHours(-VietnamUtcOffsetHours), DateTimeKind.Utc);
        var endUtc = startUtc.AddDays(ActivityDays);
        // Aggregate in PostgreSQL, independently of directory pagination. Historical deleted images
        // and ended sessions remain events; anonymous prediction images match the summary exclusion.
        var users = await CountByVietnamDayAsync(context.Users.AsNoTracking().Select(user => user.CreatedAt), startUtc, endUtc, cancellationToken);
        var images = await CountByVietnamDayAsync(context.PredictionImages.AsNoTracking()
            .Where(image => image.Prediction.UserId != null).Select(image => image.UploadedAt), startUtc, endUtc, cancellationToken);
        var sessions = await CountByVietnamDayAsync(context.LoginSessions.AsNoTracking().Select(session => session.CreatedAt), startUtc, endUtc, cancellationToken);
        var days = Enumerable.Range(0, ActivityDays).Select(offset =>
        {
            var date = firstLocalDay.AddDays(offset);
            return new AdminDailyActivityDto(DateOnly.FromDateTime(date), users.GetValueOrDefault(date),
                images.GetValueOrDefault(date), sessions.GetValueOrDefault(date));
        }).ToArray();
        return new AdminActivityDto(ActivityTimeZone, days);
    }

    private static Task<Dictionary<DateTime, int>> CountByVietnamDayAsync(IQueryable<DateTime> timestamps,
        DateTime startUtc, DateTime endUtc, CancellationToken cancellationToken) =>
        timestamps.Where(timestamp => timestamp >= startUtc && timestamp < endUtc)
            .GroupBy(timestamp => TimeZoneInfo.ConvertTimeBySystemTimeZoneId(timestamp, ActivityTimeZone).Date)
            .Select(group => new { Date = group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Date, group => group.Count, cancellationToken);

    public async Task<AdminSummaryDto> GetSummaryAsync(CancellationToken cancellationToken) => new(
        await context.Users.CountAsync(cancellationToken),
        await context.PredictionImages.CountAsync(image => image.Prediction.UserId != null, cancellationToken),
        await context.LoginSessions.CountAsync(cancellationToken));

    public async Task<PagedResult<AdminUserDto>> GetUsersAsync(int pageNumber, int pageSize, string? q, CancellationToken cancellationToken)
    {
        var query = context.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLowerInvariant();
            query = query.Where(user => user.FullName.ToLower().Contains(search) || user.Email.ToLower().Contains(search));
        }
        return await PageAsync(query.OrderByDescending(user => user.CreatedAt).ThenBy(user => user.Id)
            .Select(user => new AdminUserDto(user.Id, user.FullName, user.Email, user.Role, user.CreatedAt,
                user.LockedAt != null, user.LockedAt, user.LockReason,
                context.UserNotifications.Count(item => item.UserId == user.Id))), pageNumber, pageSize, cancellationToken);
    }

    private async Task<User> FindManagedUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await context.Users.FindAsync([userId], cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");
        if (user.Role == UserRole.Admin)
            throw new InvalidOperationException("Administrator accounts cannot be moderated here.");
        return user;
    }

    public async Task SetLockAsync(Guid userId, bool isLocked, string? reason, CancellationToken cancellationToken)
    {
        var user = await FindManagedUserAsync(userId, cancellationToken);
        if (isLocked && string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("A lock reason is required.");
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTime.UtcNow;
        user.LockedAt = isLocked ? now : null;
        user.LockReason = isLocked ? reason!.Trim() : null;
        user.UpdatedAt = now;
        if (isLocked) await EndSessionsAsync(user, now, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task RevokeSessionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await FindManagedUserAsync(userId, cancellationToken);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        await EndSessionsAsync(user, DateTime.UtcNow, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task EndSessionsAsync(User user, DateTime now, CancellationToken cancellationToken)
    {
        user.SessionsRevokedAt = now;
        await context.LoginSessions.Where(item => item.UserId == user.Id && item.EndedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.EndedAt, now), cancellationToken);
    }

    public async Task WarnUserAsync(Guid userId, Guid adminId, string message, CancellationToken cancellationToken)
    {
        await FindManagedUserAsync(userId, cancellationToken);
        await AddWarningAsync(userId, adminId, null, message, cancellationToken);
    }

    public async Task WarnImageAsync(Guid imageId, Guid adminId, string message, CancellationToken cancellationToken)
    {
        var image = await FindImageAsync(imageId, cancellationToken);
        await AddWarningAsync(image.Prediction.UserId!.Value, adminId, image.Id, message, cancellationToken);
    }

    private async Task AddWarningAsync(Guid userId, Guid adminId, Guid? imageId, string message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(message) || message.Trim().Length > 1000)
            throw new ArgumentException("A warning message of at most 1000 characters is required.");
        context.UserNotifications.Add(new UserNotification
        {
            UserId = userId, AdminId = adminId, ImageId = imageId,
            Title = imageId.HasValue ? "Cảnh báo về ảnh đã tải lên" : "Cảnh báo về tài khoản",
            Message = message.Trim()
        });
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<PredictionImage> FindImageAsync(Guid imageId, CancellationToken cancellationToken) =>
        await context.PredictionImages.Include(image => image.Prediction)
            .FirstOrDefaultAsync(image => image.Id == imageId && image.Prediction.UserId != null, cancellationToken)
        ?? throw new KeyNotFoundException("Uploaded image not found.");

    public async Task DeleteImageAsync(Guid imageId, CancellationToken cancellationToken)
    {
        var image = await FindImageAsync(imageId, cancellationToken);
        if (image.DeletedAt != null) return;
        if (string.IsNullOrWhiteSpace(image.ImagePublicId)
            || !await storage.DeleteImageAsync(image.ImagePublicId, cancellationToken))
            throw new InvalidOperationException("Storage could not confirm image deletion. Please retry.");
        if (image.Prediction.ImagePath == image.ImagePath)
        {
            image.Prediction.ImagePath = string.Empty;
            image.Prediction.ImagePublicId = null;
        }
        image.ImagePath = null;
        image.ImagePublicId = null;
        image.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<AdminImageDto>> GetImagesAsync(int pageNumber, int pageSize, string? q, Guid? userId, CancellationToken cancellationToken)
    {
        var query = context.PredictionImages.AsNoTracking().Where(image => image.Prediction.UserId != null);
        if (userId.HasValue) query = query.Where(image => image.Prediction.UserId == userId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLowerInvariant();
            query = query.Where(image => image.Prediction.User!.FullName.ToLower().Contains(search) || image.Prediction.User.Email.ToLower().Contains(search));
        }
        var now = DateTime.UtcNow;
        return await PageAsync(query.OrderByDescending(image => image.UploadedAt).ThenBy(image => image.Id).Select(image =>
            new AdminImageDto(image.Id, image.PredictionId, image.Prediction.UserId!.Value,
                image.Prediction.User!.FullName, image.Prediction.User.Email,
                image.DeletedAt == null && image.ExpiresAt > now ? image.ImagePath : null,
                image.UploadedAt, image.ExpiresAt, image.DeletedAt != null ? "Deleted" : image.ExpiresAt <= now ? "Expired" : "Available")),
            pageNumber, pageSize, cancellationToken);
    }

    public async Task<PagedResult<AdminSessionDto>> GetSessionsAsync(int pageNumber, int pageSize, string? q, Guid? userId, CancellationToken cancellationToken)
    {
        var query = context.LoginSessions.AsNoTracking();
        if (userId.HasValue) query = query.Where(session => session.UserId == userId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLowerInvariant();
            query = query.Where(session => session.User.FullName.ToLower().Contains(search) || session.User.Email.ToLower().Contains(search));
        }
        var now = DateTime.UtcNow;
        return await PageAsync(query.OrderByDescending(session => session.CreatedAt).ThenBy(session => session.Id).Select(session =>
            new AdminSessionDto(session.Id, session.UserId, session.User.FullName, session.User.Email,
                session.CreatedAt, session.ExpiresAt, session.EndedAt,
                session.EndedAt != null ? "Ended" : session.ExpiresAt <= now ? "Expired" : "Active")), pageNumber, pageSize, cancellationToken);
    }

    private static async Task<PagedResult<T>> PageAsync<T>(IQueryable<T> query, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var count = await query.CountAsync(cancellationToken);
        var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, pageNumber, pageSize, count);
    }
}
