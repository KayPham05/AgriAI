using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IPlantDiseaseRepository
{
    Task<PlantDisease?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PlantDisease?> GetByClassIndexAsync(int classIndex, CancellationToken cancellationToken = default);
    Task<PlantDisease?> GetByClassNameAsync(string className, CancellationToken cancellationToken = default);
    Task<IEnumerable<PlantDisease>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<IEnumerable<PlantDisease>> GetByPlantIdAsync(Guid plantId, CancellationToken cancellationToken = default);
    Task AddAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default);
    Task UpdateAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default);
    Task DeleteAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default);
}
