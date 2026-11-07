using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Services;

public sealed class AdminWorkspaceService(AppDbContext db, ISessionNoticePublisher sessionNotices) : IAdminWorkspaceService
{
    public async Task<PagedResult<AdminImageDto>> GetImagesAsync(AdminPageQuery filter, CancellationToken ct)
    {
        var query = db.PredictionImages.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(i => i.Prediction.User != null &&
                (i.Prediction.User.FullName.ToLower().Contains(search) || i.Prediction.User.Email.ToLower().Contains(search)));
        }
        var count = await query.CountAsync(ct);
        var now = DateTime.UtcNow;
        var items = await query.OrderByDescending(i => i.UploadedAt).ThenByDescending(i => i.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize)
            .Select(i => new AdminImageDto(i.Id, i.PredictionId, i.Prediction.UserId,
                i.Prediction.User != null ? i.Prediction.User.FullName : "Tài khoản đã xóa",
                i.Prediction.User != null ? i.Prediction.User.Email : "",
                i.DeletedAt == null && i.ExpiresAt > now ? "/api/admin/images/" + i.Id + "/content" : null,
                i.UploadedAt, i.ExpiresAt, i.DeletedAt != null ? "Deleted" : i.ExpiresAt <= now ? "Expired" : "Available"))
            .ToListAsync(ct);
        return new(items, filter.PageNumber, filter.PageSize, count);
    }

    public async Task<PagedResult<AdminSessionDto>> GetSessionsAsync(AdminPageQuery filter, CancellationToken ct)
    {
        var query = db.UserSessions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(s => s.User.FullName.ToLower().Contains(search) || s.User.Email.ToLower().Contains(search));
        }
        var count = await query.CountAsync(ct);
        var now = DateTime.UtcNow;
        var items = await query.OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize)
            .Select(s => new AdminSessionDto(s.Id, s.UserId, s.User.FullName, s.User.Email, s.CreatedAt, s.ExpiresAt,
                s.RevokedAt, s.RevokedAt != null ? "Ended" : s.ExpiresAt <= now ? "Expired" : "Active")).ToListAsync(ct);
        return new(items, filter.PageNumber, filter.PageSize, count);
    }

    public async Task WarnAsync(Guid actorId, Guid? userId, Guid? imageId, string message, CancellationToken ct)
    {
        message = message.Trim();
        if (message.Length is < 1 or > 1000) throw new ArgumentException("Nội dung cảnh báo phải có từ 1 đến 1000 ký tự.");
        if (imageId.HasValue)
        {
            var image = await db.PredictionImages.Include(i => i.Prediction).SingleOrDefaultAsync(i => i.Id == imageId, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy ảnh.");
            userId = image.Prediction.UserId;
        }
        if (!userId.HasValue || !await db.Users.AnyAsync(u => u.Id == userId, ct))
            throw new KeyNotFoundException("Không tìm thấy người dùng.");
        db.UserNotifications.Add(new UserNotification { UserId = userId.Value, ActorUserId = actorId, ImageId = imageId, Message = message });
        db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, TargetUserId = userId,
            Action = imageId.HasValue ? "WarnImage_" + imageId : "WarnUser" });
        await db.SaveChangesAsync(ct);
    }

    public async Task LogoutAllAsync(Guid actorId, Guid userId, CancellationToken ct)
    {
        if (actorId == userId) throw new ArgumentException("Dùng Đăng xuất để kết thúc phiên của chính bạn.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Serialize with session INSERTs, whose FK check locks this same user row.
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {userId} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        if (user.Role == "Admin") throw new ArgumentException("Không thể cưỡng chế đăng xuất tài khoản Admin tại đây.");
        var now = DateTime.UtcNow;
        var sessionIds = await db.UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null && s.ExpiresAt > now)
            .Select(s => s.Id).ToArrayAsync(ct);
        await db.UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(s => s.RevokedAt, s => s.CreatedAt > now ? s.CreatedAt : now)
                .SetProperty(s => s.RevocationReason, "admin_logout"), ct);
        db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, TargetUserId = userId, Action = "RevokeAllSessions" });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        await sessionNotices.PublishAsync(sessionIds, SessionNotice.Revoked("admin_logout"));
    }

    public async Task<PagedResult<UserNotificationDto>> GetNotificationsAsync(Guid userId, AdminPageQuery filter, CancellationToken ct)
    {
        var query = db.UserNotifications.AsNoTracking().Where(n => n.UserId == userId && n.DismissedAt == null);
        var count = await query.CountAsync(ct);
        var items = await query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize)
            .Select(n => new UserNotificationDto(n.Id, n.Message, n.ImageId, n.CreatedAt, n.ReadAt, n.Kind)).ToListAsync(ct);
        return new(items, filter.PageNumber, filter.PageSize, count);
    }

    public async Task UpdateNotificationAsync(Guid userId, Guid id, bool dismiss, CancellationToken ct)
    {
        var notice = await db.UserNotifications.SingleOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.DismissedAt == null, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");
        if (dismiss) notice.DismissedAt = DateTime.UtcNow;
        else notice.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAllNotificationsAsync(Guid userId, bool dismiss, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var query = db.UserNotifications.Where(n => n.UserId == userId && n.DismissedAt == null && n.CreatedAt <= now);
        if (dismiss)
            await query.ExecuteUpdateAsync(update => update.SetProperty(n => n.DismissedAt, now), ct);
        else
            await query.Where(n => n.ReadAt == null).ExecuteUpdateAsync(update => update.SetProperty(n => n.ReadAt, now), ct);
    }
}
