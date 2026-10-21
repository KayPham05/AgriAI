using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.AgriculturalProfile;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class AgriculturalProfileRepository : IAgriculturalProfileRepository
{
    private readonly AppDbContext _context;

    public AgriculturalProfileRepository(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<AgriculturalProfileDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.AgriculturalProfiles.AsNoTracking()
            .Where(profile => profile.UserId == userId)
            .OrderByDescending(profile => profile.CreatedAt).ThenByDescending(profile => profile.Id)
            .Select(profile => new AgriculturalProfileDto(profile.Id, profile.UserId, profile.Name,
                profile.Description, profile.CreatedAt, profile.UpdatedAt, profile.Predictions.Count))
            .ToListAsync(cancellationToken);

    public Task<AgriculturalProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.AgriculturalProfiles.AsNoTracking().SingleOrDefaultAsync(profile => profile.Id == id, cancellationToken);

    public Task<int> GetPredictionCountAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.Predictions.CountAsync(prediction => prediction.AgriculturalProfileId == id, cancellationToken);

    public async Task AddAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default)
    {
        await _context.AgriculturalProfiles.AddAsync(profile, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default)
    {
        _context.AgriculturalProfiles.Update(profile);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default)
    {
        _context.AgriculturalProfiles.Remove(profile);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
