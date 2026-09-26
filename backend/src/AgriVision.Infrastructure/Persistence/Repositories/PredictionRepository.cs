using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class PredictionRepository : IPredictionRepository
{
    private readonly AppDbContext _context;

    public PredictionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Prediction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Predictions
            .Include(p => p.User)
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Plant)
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Disease)
            .Include(p => p.PredictionDetails)
                .ThenInclude(pd => pd.PlantDisease)
                    .ThenInclude(pd => pd.Plant)
            .Include(p => p.PredictionDetails)
                .ThenInclude(pd => pd.PlantDisease)
                    .ThenInclude(pd => pd.Disease)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Prediction>> GetByUserIdAsync(Guid userId, int pageNumber = 1, int pageSize = 10, CancellationToken cancellationToken = default)
    {
        return await _context.Predictions
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Plant)
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Disease)
            .Include(p => p.PredictionDetails)
                .ThenInclude(pd => pd.PlantDisease)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Predictions
            .CountAsync(p => p.UserId == userId, cancellationToken);
    }

    public async Task AddAsync(Prediction prediction, CancellationToken cancellationToken = default)
    {
        await _context.Predictions.AddAsync(prediction, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Prediction prediction, CancellationToken cancellationToken = default)
    {
        _context.Predictions.Remove(prediction);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
