using AgriVision.Application.DTOs.AgriculturalProfile;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IAgriculturalProfileRepository
{
    Task<IReadOnlyList<AgriculturalProfileDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AgriculturalProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> GetPredictionCountAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default);
    Task UpdateAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default);
    Task DeleteAsync(AgriculturalProfile profile, CancellationToken cancellationToken = default);
}
