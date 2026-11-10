namespace AgriVision.Application.Services.Interfaces;

public interface ICatalogDeletionService
{
    Task DeleteAsync(string kind, Guid id, Guid actorId, CancellationToken cancellationToken = default);
}
