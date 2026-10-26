using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.Medicine;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/admin/medicines")]
[Authorize(Roles = UserRole.Admin)]
public class AdminMedicinesController(IMedicineService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<MedicineDto>>> List([FromQuery] CatalogFilterParams filter, CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(filter, false, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedicineDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetAsync(id, false, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<MedicineDto>> Create(CreateMedicineRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MedicineDto>> Update(Guid id, UpdateMedicineRequest request, CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPut("{id:guid}/publication")]
    public async Task<ActionResult<MedicineDto>> Publish(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken) =>
        Ok(await service.PublishAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeactivateAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/uses/{plantDiseaseId:guid}")]
    public async Task<ActionResult<MedicineUseDto>> AssignUse(Guid id, Guid plantDiseaseId, AssignMedicineUseRequest request, CancellationToken cancellationToken) =>
        Ok(await service.AssignUseAsync(id, plantDiseaseId, request, cancellationToken));

    [HttpDelete("{id:guid}/uses/{plantDiseaseId:guid}")]
    public async Task<IActionResult> RemoveUse(Guid id, Guid plantDiseaseId, CancellationToken cancellationToken)
    {
        await service.RemoveUseAsync(id, plantDiseaseId, cancellationToken);
        return NoContent();
    }
}
