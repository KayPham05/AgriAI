using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class MedicineRepository(AppDbContext context) : IMedicineRepository
{
    private IQueryable<Medicine> WithUses() => context.Medicines
        .Include(m => m.Uses).ThenInclude(u => u.PlantDisease).ThenInclude(p => p.Plant)
        .Include(m => m.Uses).ThenInclude(u => u.PlantDisease).ThenInclude(p => p.Disease);

    public async Task<(IReadOnlyList<Medicine> Items, int Total)> ListAsync(
        CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        var query = WithUses().AsNoTracking();
        if (publicOnly) query = query.Where(m => m.IsActive && m.IsPublic);
        if (filter.PlantId.HasValue || filter.DiseaseId.HasValue)
            query = query.Where(m => m.Uses.Any(u =>
                (!filter.PlantId.HasValue || u.PlantDisease.PlantId == filter.PlantId) &&
                (!filter.DiseaseId.HasValue || u.PlantDisease.DiseaseId == filter.DiseaseId) &&
                (!publicOnly || (u.PlantDisease.IsActive &&
                    u.PlantDisease.Plant.IsActive && u.PlantDisease.Disease.IsActive &&
                    u.PlantDisease.Disease.ConditionType == "Disease"))));
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var (ids, count) = await CatalogSearch.PageAsync(query.Select(m => new CatalogSearchEntry(m.Id, m.ProductName, m.ActiveIngredient)), filter, cancellationToken);
            var matches = await query.Where(m => ids.Contains(m.Id)).ToListAsync(cancellationToken);
            return (matches.OrderBy(m => Array.IndexOf(ids, m.Id)).ToArray(), count);
        }
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(m => m.ProductName).ThenBy(m => m.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(cancellationToken);
        return (items, total);
    }

    public Task<Medicine?> GetAsync(Guid id, bool tracking = false, CancellationToken cancellationToken = default) =>
        (tracking ? WithUses() : WithUses().AsNoTracking()).SingleOrDefaultAsync(m => m.Id == id, cancellationToken);

    public async Task AddAsync(Medicine medicine, CancellationToken cancellationToken = default)
    {
        context.Medicines.Add(medicine);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveAsync(CancellationToken cancellationToken = default) => await context.SaveChangesAsync(cancellationToken);

    public async Task<IReadOnlyList<MedicineUse>> GetEligibleUsesAsync(Guid plantDiseaseId, CancellationToken cancellationToken = default) =>
        await context.MedicineUses.AsNoTracking().Include(u => u.Medicine)
            .Where(u => u.PlantDiseaseId == plantDiseaseId &&
                u.Medicine.IsActive && u.Medicine.IsPublic &&
                u.PlantDisease.IsActive && u.PlantDisease.Plant.IsActive && u.PlantDisease.Disease.IsActive)
            .OrderBy(u => u.Medicine.ProductName).ThenBy(u => u.MedicineId).ToListAsync(cancellationToken);
}
