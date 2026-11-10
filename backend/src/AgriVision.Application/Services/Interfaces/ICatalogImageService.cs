using AgriVision.Application.Common.Interfaces.Services;
using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Services.Interfaces;

public record CatalogImageDto(string? ImageUrl);

public interface ICatalogImageService
{
    Task<CatalogImageDto> UploadAsync(string kind, Guid id, Guid actorId, IFormFile file, CancellationToken ct);
    Task RemoveAsync(string kind, Guid id, Guid actorId, CancellationToken ct);
    Task<ImageDownloadResult?> ReadAsync(string kind, Guid id, bool isAdmin, CancellationToken ct);
}
