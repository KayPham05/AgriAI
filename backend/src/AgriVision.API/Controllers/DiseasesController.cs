using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiseasesController : ControllerBase
{
    private readonly IDiseaseService _diseaseService;

    public DiseasesController(IDiseaseService diseaseService)
    {
        _diseaseService = diseaseService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DiseaseDto>>> GetAll([FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var diseases = await _diseaseService.GetAllAsync(includeInactive, cancellationToken);
        return Ok(diseases);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DiseaseDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var disease = await _diseaseService.GetByIdAsync(id, cancellationToken);
        if (disease == null)
        {
            return NotFound();
        }

        return Ok(disease);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPost]
    public async Task<ActionResult<DiseaseDto>> Create([FromBody] CreateDiseaseRequest request, CancellationToken cancellationToken)
    {
        var result = await _diseaseService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DiseaseDto>> Update(Guid id, [FromBody] UpdateDiseaseRequest request, CancellationToken cancellationToken)
    {
        var result = await _diseaseService.UpdateAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _diseaseService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
