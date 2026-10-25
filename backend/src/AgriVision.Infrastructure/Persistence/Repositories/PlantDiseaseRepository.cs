using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using AgriVision.Application.DTOs.Knowledge;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class PlantDiseaseRepository : IPlantDiseaseRepository
{
    private readonly AppDbContext _context;

    public PlantDiseaseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PlantDisease?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.PlantDiseases
            .Include(pd => pd.Plant)
            .Include(pd => pd.Disease)
            .FirstOrDefaultAsync(pd => pd.Id == id, cancellationToken);
    }

    public async Task<(IReadOnlyList<PlantDisease> Items, int Total)> SearchAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        var query = _context.PlantDiseases.AsNoTracking().Include(p => p.Plant).Include(p => p.Disease).AsQueryable();
        if (publicOnly) query = query.Where(p => p.IsActive && p.Plant.IsActive && p.Disease.IsActive);
        if (filter.PlantId.HasValue) query = query.Where(p => p.PlantId == filter.PlantId);
        if (filter.DiseaseId.HasValue) query = query.Where(p => p.DiseaseId == filter.DiseaseId);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(p => p.Plant.Name.ToLower().Contains(search) || p.Disease.Name.ToLower().Contains(search));
        }
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(p => p.ClassIndex).ThenBy(p => p.Id)
            .Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<PlantDisease?> GetByClassIndexAsync(int classIndex, CancellationToken cancellationToken = default)
    {
        return await _context.PlantDiseases
            .Include(pd => pd.Plant)
            .Include(pd => pd.Disease)
            .FirstOrDefaultAsync(pd => pd.ClassIndex == classIndex, cancellationToken);
    }

    public async Task<PlantDisease?> GetByClassNameAsync(string className, CancellationToken cancellationToken = default)
    {
        return await _context.PlantDiseases
            .Include(pd => pd.Plant)
            .Include(pd => pd.Disease)
            .FirstOrDefaultAsync(pd => pd.ClassName == className, cancellationToken);
    }

    public async Task<IEnumerable<PlantDisease>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var query = _context.PlantDiseases
            .Include(pd => pd.Plant)
            .Include(pd => pd.Disease)
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(pd => pd.IsActive);
        }

        return await query.OrderBy(pd => pd.ClassIndex).ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PlantDisease>> GetByPlantIdAsync(Guid plantId, CancellationToken cancellationToken = default)
    {
        return await _context.PlantDiseases
            .Include(pd => pd.Plant)
            .Include(pd => pd.Disease)
            .Where(pd => pd.PlantId == plantId && pd.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default)
    {
        await _context.PlantDiseases.AddAsync(plantDisease, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default)
    {
        _context.PlantDiseases.Update(plantDisease);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default)
    {
        plantDisease.IsActive = false;
        _context.PlantDiseases.Update(plantDisease);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
