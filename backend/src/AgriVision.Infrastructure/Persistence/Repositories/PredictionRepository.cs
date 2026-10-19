using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Prediction;
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
            .Include(p => p.Images)
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
            .Include(p => p.Images)
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

    public async Task<(IEnumerable<Prediction> Items, int TotalCount)> GetFilteredByUserIdAsync(
        Guid userId,
        PredictionFilterParams filterParams,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Predictions
            .AsNoTracking()
            .Where(p => p.UserId == userId);

        if (filterParams.AgriculturalProfileId.HasValue)
        {
            query = query.Where(p => p.AgriculturalProfileId == filterParams.AgriculturalProfileId.Value);
        }

        if (filterParams.PlantId.HasValue)
        {
            query = query.Where(p => p.PredictedPlantDisease.PlantId == filterParams.PlantId.Value);
        }

        if (filterParams.DiseaseId.HasValue)
        {
            query = query.Where(p => p.PredictedPlantDisease.DiseaseId == filterParams.DiseaseId.Value);
        }

        if (filterParams.FromDate.HasValue)
        {
            query = query.Where(p => p.CreatedAt >= filterParams.FromDate.Value);
        }

        if (filterParams.ToDate.HasValue)
        {
            query = query.Where(p => p.CreatedAt <= filterParams.ToDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = filterParams.PageNumber < 1 ? 1 : filterParams.PageNumber;
        var pageSize = filterParams.PageSize < 1 ? 10 : filterParams.PageSize;

        var items = await query
            .Include(p => p.Images)
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Plant)
            .Include(p => p.PredictedPlantDisease)
                .ThenInclude(pd => pd.Disease)
            .Include(p => p.PredictionDetails)
                .ThenInclude(pd => pd.PlantDisease)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
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
