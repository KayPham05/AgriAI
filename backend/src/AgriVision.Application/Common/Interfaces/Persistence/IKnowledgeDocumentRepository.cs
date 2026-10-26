using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IKnowledgeDocumentRepository
{
    Task<(IReadOnlyList<KnowledgeDocument> Items, int Total)> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default);
    Task<KnowledgeDocument?> GetAsync(Guid id, bool tracking = false, CancellationToken cancellationToken = default);
    Task AddAsync(KnowledgeDocument document, CancellationToken cancellationToken = default);
    Task SaveAsync(CancellationToken cancellationToken = default);
}
