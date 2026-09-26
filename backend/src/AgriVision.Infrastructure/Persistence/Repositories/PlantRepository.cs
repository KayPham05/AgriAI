using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class PlantRepository : IPlantRepository
{
    private readonly AppDbContext _context;

    public PlantRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Plant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Plants
            .Include(p => p.PlantDiseases)
            .ThenInclude(pd => pd.Disease)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Plant>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var query = _context.Plants.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(p => p.IsActive);
        }

        return await query.OrderBy(p => p.Name).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Plant plant, CancellationToken cancellationToken = default)
    {
        await _context.Plants.AddAsync(plant, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Plant plant, CancellationToken cancellationToken = default)
    {
        _context.Plants.Update(plant);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Plant plant, CancellationToken cancellationToken = default)
    {
        plant.IsActive = false;
        plant.UpdatedAt = DateTime.UtcNow;
        _context.Plants.Update(plant);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
