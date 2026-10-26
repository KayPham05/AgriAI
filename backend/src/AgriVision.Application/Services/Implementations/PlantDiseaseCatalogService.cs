using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.PlantDisease;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class PlantDiseaseCatalogService(IPlantDiseaseRepository repository) : IPlantDiseaseCatalogService
{
    public async Task<PagedResult<PlantDiseaseLookupDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        CatalogValidation.Filter(filter);
        var (items, total) = await repository.SearchAsync(filter, publicOnly, cancellationToken);
        return new PagedResult<PlantDiseaseLookupDto>(items.Select(Map), filter.PageNumber, filter.PageSize, total);
    }

    public async Task<PlantDiseaseLookupDto> SetAvailabilityAsync(Guid id, bool active, CancellationToken cancellationToken = default)
    {
        var pair = await repository.GetByIdAsync(id, cancellationToken) ?? throw new KeyNotFoundException("Plant/disease pair not found.");
        if (active && (!pair.Plant.IsActive || !pair.Disease.IsActive))
            throw new ArgumentException("The plant and disease must be active before enabling their pair.");
        pair.IsActive = active;
        await repository.UpdateAsync(pair, cancellationToken);
        return Map(pair);
    }

    private static PlantDiseaseLookupDto Map(PlantDisease pair) => new(pair.Id, pair.PlantId, pair.DiseaseId,
        pair.Plant.Name, pair.Disease.Name, pair.ClassName, pair.ClassIndex, pair.IsActive);
}
