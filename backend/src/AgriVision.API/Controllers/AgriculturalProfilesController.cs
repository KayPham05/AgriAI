using System.Security.Claims;
using AgriVision.Application.DTOs.AgriculturalProfile;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/agricultural-profiles")]
[Authorize]
public class AgriculturalProfilesController : ControllerBase
{
    private readonly IAgriculturalProfileService _profileService;

    public AgriculturalProfilesController(IAgriculturalProfileService profileService) => _profileService = profileService;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgriculturalProfileDto>>> GetAll(CancellationToken cancellationToken = default) =>
        Ok(await _profileService.GetByUserIdAsync(GetCurrentUserId(), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AgriculturalProfileDto>> GetById(Guid id, CancellationToken cancellationToken = default) =>
        Ok(await _profileService.GetByIdAsync(id, GetCurrentUserId(), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<AgriculturalProfileDto>> Create(CreateAgriculturalProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = await _profileService.CreateAsync(GetCurrentUserId(), request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = profile.Id }, profile);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AgriculturalProfileDto>> Update(Guid id, UpdateAgriculturalProfileRequest request, CancellationToken cancellationToken = default) =>
        Ok(await _profileService.UpdateAsync(id, GetCurrentUserId(), request, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        await _profileService.DeleteAsync(id, GetCurrentUserId(), cancellationToken);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(claim, out var userId))
            throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");
        return userId;
    }
}
