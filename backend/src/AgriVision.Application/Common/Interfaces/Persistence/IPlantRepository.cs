using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IPlantRepository
{
    Task<Plant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Plant>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task AddAsync(Plant plant, CancellationToken cancellationToken = default);
    Task UpdateAsync(Plant plant, CancellationToken cancellationToken = default);
    Task DeleteAsync(Plant plant, CancellationToken cancellationToken = default);
}
