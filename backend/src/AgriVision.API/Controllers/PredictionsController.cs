using System.Security.Claims;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictionService;

    public PredictionsController(IPredictionService predictionService)
    {
        _predictionService = predictionService;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PredictionResultDto>> Predict([FromForm] PredictRequest request, CancellationToken cancellationToken)
    {
        Guid? userId = null;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        var result = await _predictionService.PredictAsync(request.File, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<PagedResult<PredictionHistoryDto>>> GetHistory(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _predictionService.GetPredictionHistoryAsync(userId, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PredictionResultDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _predictionService.GetPredictionByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var isAdmin = User.IsInRole(UserRole.Admin);
        await _predictionService.DeletePredictionAsync(id, userId, isAdmin, cancellationToken);
        return NoContent();
    }
}
