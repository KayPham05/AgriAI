using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Common.Interfaces.Services;

public record ImageUploadResult(string PublicId, string SecureUrl);

public interface IImageStorage
{
    Task<ImageUploadResult> UploadImageAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<ImageUploadResult> UploadImageAsync(Stream imageStream, string fileName, CancellationToken cancellationToken = default);
    Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default);
}
