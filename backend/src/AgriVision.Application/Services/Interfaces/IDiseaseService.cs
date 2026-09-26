using AgriVision.Application.DTOs.Disease;

namespace AgriVision.Application.Services.Interfaces;

public interface IDiseaseService
{
    Task<IEnumerable<DiseaseDto>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<DiseaseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<DiseaseDto> CreateAsync(CreateDiseaseRequest request, CancellationToken cancellationToken = default);
    Task<DiseaseDto> UpdateAsync(Guid id, UpdateDiseaseRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
