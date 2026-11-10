using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Services;

public sealed class AdminImageService(AppDbContext db, IImageStorage storage) : IAdminImageService
{
    private static bool ValidKey(PredictionImage image) => image.Prediction.UserId is Guid owner &&
        ImageStorageKey.Matches(image.ImagePublicId, new ImageStorageContext(owner, image.PredictionId, image.Id));

    public async Task<ImageDownloadResult?> ReadAsync(Guid id, CancellationToken ct)
    {
        var image = await db.PredictionImages.AsNoTracking().Include(i => i.Prediction).SingleOrDefaultAsync(i => i.Id == id, ct);
        if (image == null || image.DeletedAt != null || image.ExpiresAt <= DateTime.UtcNow || !ValidKey(image)) return null;
        return await storage.ReadImageAsync(image.ImagePublicId!, ct);
    }

    public async Task DeleteAsync(Guid actorId, Guid id, CancellationToken ct)
    {
        var image = await db.PredictionImages.Include(i => i.Prediction).SingleOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy ảnh.");
        if (image.DeletedAt != null) return;
        if (!ValidKey(image)) throw new InvalidOperationException("Khóa lưu trữ không khớp thông tin ảnh.");
        // Delete is idempotent in storage, so a failed DB save can be retried safely.
        if (!await storage.DeleteImageAsync(image.ImagePublicId!, ct))
            throw new ImageStorageException("Chưa xóa được tệp ảnh. Vui lòng thử lại.");
        image.DeletedAt = DateTime.UtcNow;
        image.ImagePath = null;
        if (image.Prediction.ImagePublicId == image.ImagePublicId)
        {
            image.Prediction.ImagePath = string.Empty;
            image.Prediction.ImagePublicId = null;
        }
        db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, TargetUserId = image.Prediction.UserId, Action = "DeleteImage_" + id });
        await db.SaveChangesAsync(ct);
    }
}
