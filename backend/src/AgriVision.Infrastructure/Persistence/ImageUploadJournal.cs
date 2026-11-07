using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AgriVision.Infrastructure.Persistence;

public sealed class ImageUploadJournal(AppDbContext database, IConfiguration configuration) : IImageUploadJournal
{
    public async Task ReserveAsync(ImageStorageContext context, string key, CancellationToken cancellationToken)
    {
        if (!ImageStorageKey.Matches(key, context) || !(key.StartsWith("users/", StringComparison.Ordinal) || key.StartsWith("category/", StringComparison.Ordinal)))
            throw new ArgumentException("Invalid upload reservation.");
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        // Serialize quota reservations for this owner across requests/processes.
        var user = await database.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {context.UserId} FOR UPDATE")
            .AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (user == null || !user.IsActive) throw new UnauthorizedAccessException("User is unavailable.");
        if (context.CatalogKind != null)
        {
            if (user.Role != "Admin") throw new UnauthorizedAccessException("Only administrators can upload catalog images.");
            var prefix = $"users/{context.UserId:D}/catalog/";
            var ownerPattern = $"category/%/%/{context.UserId:D}/%";
            var catalogCount = await database.Plants.CountAsync(p => p.ImageKey != null && (p.ImageKey.StartsWith(prefix) || EF.Functions.Like(p.ImageKey, ownerPattern)), cancellationToken)
                + await database.Diseases.CountAsync(d => d.ImageKey != null && (d.ImageKey.StartsWith(prefix) || EF.Functions.Like(d.ImageKey, ownerPattern)), cancellationToken)
                + await database.PendingImageUploads.CountAsync(p => p.UserId == context.UserId && (p.Key.StartsWith(prefix) || p.Key.StartsWith("category/")), cancellationToken);
            var catalogLimit = configuration.GetValue("StorageLimits:MaxCatalogImagesPerAdmin", 1000);
            if (catalogLimit < 1) throw new InvalidOperationException("Catalog image quota must be positive.");
            if (catalogCount >= catalogLimit) throw new ArgumentException("Đã đạt giới hạn lưu ảnh danh mục.");
            database.PendingImageUploads.Add(new PendingImageUpload { Key = key, UserId = context.UserId });
            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return;
        }
        var limit = configuration.GetValue("StorageLimits:MaxImagesPerUser", 100);
        if (limit < 1) throw new InvalidOperationException("Storage quota must be positive.");
        var stored = await database.PredictionImages.CountAsync(image => image.Prediction.UserId == context.UserId && image.DeletedAt == null, cancellationToken);
        if (!context.IsAvatar && user.AvatarUrl != null) stored++;
        var pending = await database.PendingImageUploads.CountAsync(item => item.UserId == context.UserId && !item.Key.Contains("/catalog/") && !item.Key.StartsWith("category/"), cancellationToken);
        if (stored + pending >= limit) throw new ArgumentException("Image storage quota reached. Delete saved images before uploading more.");
        database.PendingImageUploads.Add(new PendingImageUpload { Key = key, UserId = context.UserId });
        await database.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task CompleteAsync(string key, CancellationToken cancellationToken) =>
        await database.PendingImageUploads.Where(item => item.Key == key).ExecuteDeleteAsync(cancellationToken);

    public async Task RetireAvatarAsync(Guid userId, string key, CancellationToken cancellationToken)
    {
        if (!ImageStorageKey.IsAvatarForUser(key, userId)) throw new ArgumentException("Invalid retired avatar key.");
        if (await database.PendingImageUploads.AnyAsync(item => item.Key == key, cancellationToken)) return;
        database.PendingImageUploads.Add(new PendingImageUpload { Key = key, UserId = userId });
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task RetireCatalogAsync(Guid actorId, string kind, Guid id, string key, CancellationToken cancellationToken)
    {
        if (!ImageStorageKey.IsCatalogImage(key, kind, id)) throw new ArgumentException("Invalid retired catalog image.");
        if (await database.PendingImageUploads.AnyAsync(item => item.Key == key, cancellationToken)) return;
        database.PendingImageUploads.Add(new PendingImageUpload { Key = key, UserId = actorId });
        await database.SaveChangesAsync(cancellationToken);
    }
}
