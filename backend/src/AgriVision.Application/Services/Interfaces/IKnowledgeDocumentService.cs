using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;

namespace AgriVision.Application.Services.Interfaces;

public interface IKnowledgeDocumentService
{
    Task<PagedResult<KnowledgeDocumentDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default);
    Task<KnowledgeDocumentDto> GetAsync(Guid id, bool publicOnly, CancellationToken cancellationToken = default);
    Task<KnowledgeDocumentDto> CreateAsync(CreateKnowledgeDocumentRequest request, CancellationToken cancellationToken = default);
    Task<KnowledgeDocumentDto> UpdateAsync(Guid id, UpdateKnowledgeDocumentRequest request, CancellationToken cancellationToken = default);
    Task<KnowledgeDocumentDto> PublishAsync(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken = default);
    Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
}
