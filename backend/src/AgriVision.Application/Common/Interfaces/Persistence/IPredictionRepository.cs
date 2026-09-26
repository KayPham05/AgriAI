using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IPredictionRepository
{
    Task<Prediction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Prediction>> GetByUserIdAsync(Guid userId, int pageNumber = 1, int pageSize = 10, CancellationToken cancellationToken = default);
    Task<int> GetCountByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Prediction prediction, CancellationToken cancellationToken = default);
    Task DeleteAsync(Prediction prediction, CancellationToken cancellationToken = default);
}
