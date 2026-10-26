using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface IMedicineRepository
{
    Task<(IReadOnlyList<Medicine> Items, int Total)> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default);
    Task<Medicine?> GetAsync(Guid id, bool tracking = false, CancellationToken cancellationToken = default);
    Task AddAsync(Medicine medicine, CancellationToken cancellationToken = default);
    Task SaveAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MedicineUse>> GetEligibleUsesAsync(Guid plantDiseaseId, CancellationToken cancellationToken = default);
}
