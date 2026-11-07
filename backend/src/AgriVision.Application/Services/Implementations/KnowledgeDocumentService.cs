using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class KnowledgeDocumentService(IKnowledgeDocumentRepository repository, IPlantDiseaseRepository pairs) : IKnowledgeDocumentService
{
    public async Task<PagedResult<KnowledgeDocumentDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        CatalogValidation.Filter(filter);
        var (items, total) = await repository.ListAsync(filter, publicOnly, cancellationToken);
        return new PagedResult<KnowledgeDocumentDto>(items.Select(d => Map(d, publicOnly)), filter.PageNumber, filter.PageSize, total);
    }

    public async Task<KnowledgeDocumentDto> GetAsync(Guid id, bool publicOnly, CancellationToken cancellationToken = default)
    {
        var document = await FindAsync(id, false, cancellationToken);
        if (publicOnly && !(document.IsActive && document.IsApproved && document.IsPublic))
            throw new KeyNotFoundException("Knowledge document not found.");
        return Map(document, publicOnly);
    }

    public async Task<KnowledgeDocumentDto> CreateAsync(CreateKnowledgeDocumentRequest request, CancellationToken cancellationToken = default)
    {
        var document = new KnowledgeDocument();
        await SetContentAsync(document, request.Title, request.Content, request.SourceUrl, request.PlantDiseaseIds, cancellationToken);
        await repository.AddAsync(document, cancellationToken);
        return Map(await FindAsync(document.Id, false, cancellationToken));
    }

    public async Task<KnowledgeDocumentDto> UpdateAsync(Guid id, UpdateKnowledgeDocumentRequest request, CancellationToken cancellationToken = default)
    {
        var document = await FindAsync(id, true, cancellationToken);
        await SetContentAsync(document, request.Title, request.Content, request.SourceUrl, request.PlantDiseaseIds, cancellationToken);
        document.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
        // Content/link triggers may change publication after EF writes the tracked entity.
        return Map(await FindAsync(id, false, cancellationToken));
    }

    public async Task<KnowledgeDocumentDto> PublishAsync(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken = default)
    {
        CatalogValidation.Publication(request);
        var document = await FindAsync(id, true, cancellationToken);
        document.IsApproved = request.IsApproved;
        document.IsPublic = request.IsPublic;
        document.IsActive = request.IsActive;
        document.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
        return Map(await FindAsync(id, false, cancellationToken));
    }

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var document = await FindAsync(id, true, cancellationToken);
        document.IsActive = false;
        document.IsPublic = false;
        document.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
    }

    private async Task SetContentAsync(KnowledgeDocument document, string title, string content, string source,
        IReadOnlyList<Guid>? pairIds, CancellationToken cancellationToken)
    {
        var validatedTitle = CatalogValidation.Text(title, "Title", 200);
        var validatedContent = CatalogValidation.Text(content, "Content");
        var validatedSource = CatalogValidation.Source(source);
        if (pairIds == null || pairIds.Any(id => id == Guid.Empty) || pairIds.Distinct().Count() != pairIds.Count)
            throw new ArgumentException("PlantDiseaseIds must be a list of distinct, nonempty IDs.");
        var selected = new List<PlantDisease>();
        foreach (var id in pairIds)
        {
            var pair = await pairs.GetByIdAsync(id, cancellationToken);
            if (pair == null || !CatalogValidation.ActivePair(pair))
                throw new ArgumentException("A linked plant/disease pair does not exist or is inactive.");
            selected.Add(pair);
        }
        document.Title = validatedTitle;
        document.Content = validatedContent;
        document.SourceUrl = validatedSource;
        foreach (var link in document.PlantDiseases.Where(l => !pairIds.Contains(l.PlantDiseaseId)).ToList())
            document.PlantDiseases.Remove(link);
        foreach (var pair in selected.Where(p => document.PlantDiseases.All(l => l.PlantDiseaseId != p.Id)))
            document.PlantDiseases.Add(new KnowledgeDocumentPlantDisease
            {
                KnowledgeDocumentId = document.Id, PlantDiseaseId = pair.Id, PlantDisease = pair
            });
    }

    private async Task<KnowledgeDocument> FindAsync(Guid id, bool tracking, CancellationToken cancellationToken) =>
        await repository.GetAsync(id, tracking, cancellationToken) ?? throw new KeyNotFoundException("Knowledge document not found.");

    private static KnowledgeDocumentDto Map(KnowledgeDocument document, bool publicOnly = false) => new(document.Id,
        document.Title, document.Content, document.SourceUrl, document.IsApproved, document.IsPublic,
        document.IsActive, document.CreatedAt, document.UpdatedAt,
        document.PlantDiseases.Where(l => !publicOnly || CatalogValidation.ActivePair(l.PlantDisease))
            .Select(l => l.PlantDiseaseId).OrderBy(id => id).ToList());
}
