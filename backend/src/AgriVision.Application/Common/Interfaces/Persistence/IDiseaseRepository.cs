using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IDiseaseRepository
{
    Task<Disease?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Disease>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task AddAsync(Disease disease, CancellationToken cancellationToken = default);
    Task UpdateAsync(Disease disease, CancellationToken cancellationToken = default);
    Task DeleteAsync(Disease disease, CancellationToken cancellationToken = default);
}
