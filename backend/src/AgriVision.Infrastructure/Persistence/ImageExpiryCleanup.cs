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
        logger.LogInformation("Checked {ImageCount} expired images; prediction history was retained.", images.Count);
        return failed ? 1 : 0;
    }
}
