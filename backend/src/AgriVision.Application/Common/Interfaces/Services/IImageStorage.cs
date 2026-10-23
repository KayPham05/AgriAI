using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Common.Interfaces.Services;

public record ImageUploadResult(string PublicId, string SecureUrl);
public record ImageDownloadResult(byte[] Content, string ContentType);

public record ImageStorageContext(Guid UserId, Guid PredictionId, Guid ImageId);

public interface IImageStorage
{
    Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default);
    Task<ImageUploadResult> UploadImageAsync(Stream imageStream, string fileName, ImageStorageContext context, CancellationToken cancellationToken = default);
    Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default);
    Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default);
}
