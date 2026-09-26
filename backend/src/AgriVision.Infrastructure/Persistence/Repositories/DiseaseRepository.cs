using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class DiseaseRepository : IDiseaseRepository
{
    private readonly AppDbContext _context;

    public DiseaseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Disease?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Diseases
            .Include(d => d.PlantDiseases)
            .ThenInclude(pd => pd.Plant)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Disease>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var query = _context.Diseases.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(d => d.IsActive);
        }

        return await query.OrderBy(d => d.Name).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Disease disease, CancellationToken cancellationToken = default)
    {
        await _context.Diseases.AddAsync(disease, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Disease disease, CancellationToken cancellationToken = default)
    {
        _context.Diseases.Update(disease);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Disease disease, CancellationToken cancellationToken = default)
    {
        disease.IsActive = false;
        disease.UpdatedAt = DateTime.UtcNow;
        _context.Diseases.Update(disease);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
