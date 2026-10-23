using AgriVision.Application.Common.Interfaces.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Persistence;

public static class ImageExpiryCleanup
{
    public static async Task<int> RunAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
        var now = DateTime.UtcNow;
        var images = await database.PredictionImages.Include(image => image.Prediction)
            .Where(image => image.ExpiresAt <= now && image.DeletedAt == null).ToListAsync(cancellationToken);
        var failed = false;
        foreach (var image in images)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(image.ImagePublicId))
                    throw new InvalidOperationException("Image public ID is missing; deletion cannot be confirmed.");
                if (!image.Prediction.UserId.HasValue || !ImageStorageKey.Matches(image.ImagePublicId,
                    new ImageStorageContext(image.Prediction.UserId.Value, image.PredictionId, image.Id)))
                    throw new InvalidOperationException("Image storage key does not match its metadata.");
                if (!await storage.DeleteImageAsync(image.ImagePublicId, cancellationToken))
                    throw new InvalidOperationException("Storage did not confirm image deletion.");
                if (image.Prediction.ImagePath == image.ImagePath)
                {
                    image.Prediction.ImagePath = string.Empty;
                    image.Prediction.ImagePublicId = null;
                }
                image.ImagePath = null;
                image.ImagePublicId = null;
                image.DeletedAt = now;
                await database.SaveChangesAsync(cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                failed = true;
                // Retry on the next explicit cleanup command; keep the result/snapshot.
                database.Entry(image).Reload();
                database.Entry(image.Prediction).Reload();
                logger.LogError(exception, "Image cleanup failed for {ImageId}.", image.Id);
            }
        }
        // Durable intents survive lost acknowledgements and process termination.
        // One hour exceeds bounded request/upload/DB timeouts; do not touch live uploads.
        var staleBefore = now.AddHours(-1);
        var pending = await database.PendingImageUploads.Where(item => item.CreatedAt < staleBefore).ToListAsync(cancellationToken);
        foreach (var item in pending)
        {
            try
            {
                var referenced = await database.PredictionImages.AnyAsync(image => image.ImagePublicId == item.Key, cancellationToken)
                    || await database.Predictions.AnyAsync(prediction => prediction.ImagePublicId == item.Key, cancellationToken);
                if (!referenced)
                {
                    if (!ImageStorageKey.IsSupported(item.Key) || !item.Key.StartsWith("users/", StringComparison.Ordinal))
                        throw new InvalidOperationException("Invalid pending upload key.");
                    if (!await storage.DeleteImageAsync(item.Key, cancellationToken))
                        throw new InvalidOperationException("Pending upload deletion was not confirmed.");
                }
                database.PendingImageUploads.Remove(item);
                await database.SaveChangesAsync(cancellationToken);
            }
            catch (Exception error) when (error is not OperationCanceledException)
            {
                failed = true;
                database.Entry(item).State = EntityState.Unchanged;
                logger.LogError(error, "Pending image upload cleanup failed.");
            }
        }
        logger.LogInformation("Checked {ImageCount} expired images; prediction history was retained.", images.Count);
        return failed ? 1 : 0;
    }
}
