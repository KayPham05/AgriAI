using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Persistence;

// Explicit maintenance command. Each record commits independently and can be retried.
public static class CatalogImageMigration
{
    public static async Task<int> RunAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
        var plants = await db.Plants.Where(p => p.ImageKey != null && p.ImageKey.StartsWith("users/"))
            .Select(p => p.Id).ToListAsync(ct);
        var diseases = await db.Diseases.Where(d => d.ImageKey != null && d.ImageKey.StartsWith("users/"))
            .Select(d => d.Id).ToListAsync(ct);
        var failed = false;
        foreach (var (kind, id) in plants.Select(id => ("plants", id)).Concat(diseases.Select(id => ("diseases", id))))
        {
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeout.CancelAfter(TimeSpan.FromMinutes(2));
                await MoveAsync(services, kind, id, timeout.Token);
                logger.LogInformation("Catalog image migration checked {Kind}/{Id}.", kind, id);
            }
            catch (Exception error) when (!ct.IsCancellationRequested)
            {
                failed = true;
                logger.LogError(error, "Catalog image migration failed for {Kind}/{Id}; retry the command.", kind, id);
            }
        }
        return failed ? 1 : 0;
    }

    private static async Task MoveAsync(IServiceProvider services, string kind, Guid id, CancellationToken ct)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var journal = scope.ServiceProvider.GetRequiredService<IImageUploadJournal>();
        string? oldKey;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            // Serialize with replacement/deletion and other migration processes.
            var plant = kind == "plants"
                ? await db.Plants.FromSqlInterpolated($"SELECT * FROM plants WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) : null;
            var disease = kind == "diseases"
                ? await db.Diseases.FromSqlInterpolated($"SELECT * FROM diseases WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) : null;
            oldKey = plant?.ImageKey ?? disease?.ImageKey;
            if (oldKey == null || oldKey.StartsWith("category/", StringComparison.Ordinal)) return;
            if (!ImageStorageKey.IsCatalogImage(oldKey, kind, id))
                throw new InvalidOperationException("The stored image key does not belong to this catalog record.");

            var owner = Guid.Parse(oldKey.Split('/')[1]);
            var context = new ImageStorageContext(owner, Guid.Empty, Guid.NewGuid(), CatalogKind: kind, CatalogId: id);
            var extension = Path.GetExtension(oldKey);
            var target = ImageStorageKey.Create(context, extension);
            // Commit intent outside the record transaction: a crash/rollback must leave
            // a cleanup record. A fresh target avoids colliding with an earlier cleanup.
            await using (var intentScope = services.CreateAsyncScope())
            {
                var intentDb = intentScope.ServiceProvider.GetRequiredService<AppDbContext>();
                intentDb.PendingImageUploads.Add(new PendingImageUpload { Key = target, UserId = owner });
                await intentDb.SaveChangesAsync(ct);
            }

            var storage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
            var original = await storage.ReadImageAsync(oldKey, ct)
                ?? throw new InvalidOperationException("The original catalog image is missing.");
            using var stream = new MemoryStream(original.Content, writable: false);
            var uploaded = await storage.UploadImageAsync(stream, $"catalog{extension}", context, ct);
            if (uploaded.PublicId != target)
                throw new InvalidOperationException("Storage returned an unexpected catalog image key.");
            var copied = await storage.ReadImageAsync(target, ct);
            if (copied == null || !original.Content.AsSpan().SequenceEqual(copied.Content))
                throw new InvalidOperationException("Catalog image copy verification failed; the original is retained.");

            if (plant != null) plant.ImageKey = target;
            else disease!.ImageKey = target;
            await db.SaveChangesAsync(ct);
            await journal.RetireCatalogAsync(owner, kind, id, oldKey, ct);
            await journal.CompleteAsync(target, ct);
            await transaction.CommitAsync(ct);
        }

        // A failure here leaves the old object in the durable cleanup journal.
        var imageStorage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
        if (await imageStorage.DeleteImageAsync(oldKey, ct)) await journal.CompleteAsync(oldKey, ct);
        else throw new InvalidOperationException("The copy is active; the old object is queued for --expire-images.");
    }
}
