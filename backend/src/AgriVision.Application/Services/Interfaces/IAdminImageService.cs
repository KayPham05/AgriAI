using AgriVision.Application.Common.Interfaces.Services;

namespace AgriVision.Application.Services.Interfaces;

public interface IAdminImageService
{
    Task<ImageDownloadResult?> ReadAsync(Guid id, CancellationToken cancellationToken);
    Task DeleteAsync(Guid actorId, Guid id, CancellationToken cancellationToken);
}
