using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class KnowledgeDocumentRepository(AppDbContext context) : IKnowledgeDocumentRepository
{
    private IQueryable<KnowledgeDocument> WithLinks() => context.KnowledgeDocuments
        .Include(d => d.PlantDiseases).ThenInclude(l => l.PlantDisease).ThenInclude(p => p.Plant)
        .Include(d => d.PlantDiseases).ThenInclude(l => l.PlantDisease).ThenInclude(p => p.Disease);

    public async Task<(IReadOnlyList<KnowledgeDocument> Items, int Total)> ListAsync(
        CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        var query = WithLinks().AsNoTracking();
        if (publicOnly) query = query.Where(d => d.IsActive && d.IsApproved && d.IsPublic);
        if (filter.PlantId.HasValue || filter.DiseaseId.HasValue)
            query = query.Where(d => d.PlantDiseases.Any(l =>
                (!filter.PlantId.HasValue || l.PlantDisease.PlantId == filter.PlantId) &&
                (!filter.DiseaseId.HasValue || l.PlantDisease.DiseaseId == filter.DiseaseId) &&
                (!publicOnly || (l.PlantDisease.IsActive && l.PlantDisease.Plant.IsActive && l.PlantDisease.Disease.IsActive))));
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(d => d.Title.ToLower().Contains(search));
        }
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(d => d.Title).ThenBy(d => d.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(cancellationToken);
        return (items, total);
    }

    public Task<KnowledgeDocument?> GetAsync(Guid id, bool tracking = false, CancellationToken cancellationToken = default) =>
        (tracking ? WithLinks() : WithLinks().AsNoTracking()).SingleOrDefaultAsync(d => d.Id == id, cancellationToken);

    public async Task AddAsync(KnowledgeDocument document, CancellationToken cancellationToken = default)
    {
        context.KnowledgeDocuments.Add(document);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveAsync(CancellationToken cancellationToken = default) => await context.SaveChangesAsync(cancellationToken);
}
