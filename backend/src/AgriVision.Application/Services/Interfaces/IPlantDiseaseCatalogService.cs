using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.PlantDisease;

namespace AgriVision.Application.Services.Interfaces;

public interface IPlantDiseaseCatalogService
{
    Task<PagedResult<PlantDiseaseLookupDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default);
    Task<PlantDiseaseLookupDto> SetAvailabilityAsync(Guid id, bool active, CancellationToken cancellationToken = default);
}
