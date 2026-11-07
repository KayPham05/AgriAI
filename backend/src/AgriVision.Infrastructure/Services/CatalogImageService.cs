using AgriVision.Application.Common;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Services;

public sealed class CatalogImageService(AppDbContext db, IImageStorage storage,
    IImageUploadJournal journal, ILogger<CatalogImageService> logger) : ICatalogImageService
{
    public const int MaxBytes = 5 * 1024 * 1024;
    private sealed record Metadata(string? Key, bool IsActive);

    public async Task<CatalogImageDto> UploadAsync(string kind, Guid id, Guid actorId, IFormFile file, CancellationToken ct)
    {
        ValidateKind(kind);
        if (await MetadataAsync(kind, id, false, ct) == null) throw new KeyNotFoundException("Không tìm thấy mục danh mục.");
        var (bytes, extension) = await ReadUploadAsync(file, ct);
        var context = new ImageStorageContext(actorId, Guid.Empty, Guid.NewGuid(), CatalogKind: kind, CatalogId: id);
        var key = ImageStorageKey.Create(context, extension);
        await journal.ReserveAsync(context, key, ct);
        string? previous = null;
        try
        {
            using var stream = new MemoryStream(bytes);
            var upload = await storage.UploadImageAsync(stream, "catalog" + extension, context, ct);
            if (upload.PublicId != key) throw new InvalidOperationException("Catalog image storage key mismatch.");
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var metadata = await MetadataAsync(kind, id, true, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy mục danh mục.");
            previous = metadata.Key;
            if (previous != null) await journal.RetireCatalogAsync(actorId, kind, id, previous, ct);
            await SetKeyAsync(kind, id, key, ct);
            db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, Action = $"UploadCatalogImage_{kind}_{id:D}" });
            await db.SaveChangesAsync(ct);
            await journal.CompleteAsync(key, ct);
            await transaction.CommitAsync(ct);
        }
        finally
        {
            // Verify persisted references even if a commit acknowledgement was lost.
            await CleanupAsync(kind, id, key);
            if (previous != null) await CleanupAsync(kind, id, previous);
        }
        return new(CatalogImageUrl.Create(kind, id, key));
    }

    public async Task RemoveAsync(string kind, Guid id, Guid actorId, CancellationToken ct)
    {
        ValidateKind(kind);
        string? previous = null;
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var metadata = await MetadataAsync(kind, id, true, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy mục danh mục.");
            previous = metadata.Key;
            if (previous != null)
            {
                await journal.RetireCatalogAsync(actorId, kind, id, previous, ct);
                await SetKeyAsync(kind, id, null, ct);
                db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, Action = $"RemoveCatalogImage_{kind}_{id:D}" });
                await db.SaveChangesAsync(ct);
            }
            await transaction.CommitAsync(ct);
        }
        finally
        {
            if (previous != null) await CleanupAsync(kind, id, previous);
        }
    }

    public async Task<ImageDownloadResult?> ReadAsync(string kind, Guid id, bool isAdmin, CancellationToken ct)
    {
        ValidateKind(kind);
        var metadata = await MetadataAsync(kind, id, false, ct);
        if (metadata?.Key == null || (!metadata.IsActive && !isAdmin)) return null;
        if (!ImageStorageKey.IsCatalogImage(metadata.Key, kind, id)) throw new InvalidOperationException("Invalid catalog image metadata.");
        return await storage.ReadImageAsync(metadata.Key, ct);
    }

    private Task<Metadata?> MetadataAsync(string kind, Guid id, bool forUpdate, CancellationToken ct)
    {
        if (kind == "plants")
        {
            var plants = forUpdate ? db.Plants.FromSqlInterpolated($"SELECT * FROM plants WHERE id = {id} FOR UPDATE") : db.Plants;
            return plants.AsNoTracking().Where(p => p.Id == id).Select(p => new Metadata(p.ImageKey, p.IsActive)).SingleOrDefaultAsync(ct);
        }
        var diseases = forUpdate ? db.Diseases.FromSqlInterpolated($"SELECT * FROM diseases WHERE id = {id} FOR UPDATE") : db.Diseases;
        return diseases.AsNoTracking().Where(d => d.Id == id).Select(d => new Metadata(d.ImageKey, d.IsActive)).SingleOrDefaultAsync(ct);
    }

    private Task<int> SetKeyAsync(string kind, Guid id, string? key, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return kind == "plants"
            ? db.Plants.Where(p => p.Id == id).ExecuteUpdateAsync(update => update.SetProperty(p => p.ImageKey, key).SetProperty(p => p.UpdatedAt, now), ct)
            : db.Diseases.Where(d => d.Id == id).ExecuteUpdateAsync(update => update.SetProperty(d => d.ImageKey, key).SetProperty(d => d.UpdatedAt, now), ct);
    }

    private async Task CleanupAsync(string kind, Guid id, string key)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        try
        {
            if (!ImageStorageKey.IsCatalogImage(key, kind, id)) throw new InvalidOperationException("Invalid cleanup key.");
            var current = await MetadataAsync(kind, id, false, timeout.Token);
            if (current?.Key == key || await storage.DeleteImageAsync(key, timeout.Token))
                await journal.CompleteAsync(key, timeout.Token);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Catalog image cleanup remains in the upload journal for the explicit cleanup command.");
        }
    }

    private static void ValidateKind(string kind)
    {
        if (kind is not ("plants" or "diseases")) throw new ArgumentException("Loại danh mục không hợp lệ.");
    }

    private static async Task<(byte[] Bytes, string Extension)> ReadUploadAsync(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length is < 1 or > MaxBytes) throw new ArgumentException("Chọn ảnh JPG hoặc PNG không quá 5 MB.");
        if (file.ContentType is not ("image/jpeg" or "image/png")) throw new ArgumentException("Chỉ hỗ trợ ảnh JPG hoặc PNG.");
        using var buffer = new MemoryStream();
        await using var input = file.OpenReadStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await input.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > MaxBytes) throw new ArgumentException("Ảnh vượt quá 5 MB.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), ct);
        }
        var bytes = buffer.ToArray();
        var png = bytes.Length >= 24 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })
            && bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8);
        var jpeg = bytes.Length >= 4 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255 && bytes[^2] == 255 && bytes[^1] == 217;
        if (png && file.ContentType == "image/png") return (bytes, ".png");
        if (jpeg && file.ContentType == "image/jpeg") return (bytes, ".jpg");
        throw new ArgumentException("Nội dung ảnh không đúng định dạng JPG hoặc PNG.");
    }
}
