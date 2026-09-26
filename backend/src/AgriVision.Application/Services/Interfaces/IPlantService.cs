using AgriVision.Application.DTOs.Plant;

namespace AgriVision.Application.Services.Interfaces;

public interface IPlantService
{
    Task<IEnumerable<PlantDto>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<PlantDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PlantDto> CreateAsync(CreatePlantRequest request, CancellationToken cancellationToken = default);
    Task<PlantDto> UpdateAsync(Guid id, UpdatePlantRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
