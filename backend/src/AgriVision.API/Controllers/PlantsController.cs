using AgriVision.Application.DTOs.Plant;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlantsController : ControllerBase
{
    private readonly IPlantService _plantService;

    public PlantsController(IPlantService plantService)
    {
        _plantService = plantService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlantDto>>> GetAll([FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var plants = await _plantService.GetAllAsync(includeInactive, cancellationToken);
        return Ok(plants);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PlantDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var plant = await _plantService.GetByIdAsync(id, cancellationToken);
        if (plant == null)
        {
            return NotFound();
        }

        return Ok(plant);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPost]
    public async Task<ActionResult<PlantDto>> Create([FromBody] CreatePlantRequest request, CancellationToken cancellationToken)
    {
        var result = await _plantService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PlantDto>> Update(Guid id, [FromBody] UpdatePlantRequest request, CancellationToken cancellationToken)
    {
        var result = await _plantService.UpdateAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _plantService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
