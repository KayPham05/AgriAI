using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.PlantDisease;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
public class PlantDiseaseCatalogController(IPlantDiseaseCatalogService service) : ControllerBase
{
    [HttpGet("api/plant-diseases")]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<PlantDiseaseLookupDto>>> List([FromQuery] CatalogFilterParams filter, CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(filter, true, cancellationToken));

    [HttpGet("api/admin/plant-diseases")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<ActionResult<PagedResult<PlantDiseaseLookupDto>>> AdminList([FromQuery] CatalogFilterParams filter, CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(filter, false, cancellationToken));

    [HttpPut("api/admin/plant-diseases/{id:guid}/availability")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<ActionResult<PlantDiseaseLookupDto>> SetAvailability(Guid id, PlantDiseaseAvailabilityRequest request, CancellationToken cancellationToken) =>
        Ok(await service.SetAvailabilityAsync(id, request.IsActive, cancellationToken));
}
