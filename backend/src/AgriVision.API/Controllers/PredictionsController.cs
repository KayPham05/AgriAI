using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http.Timeouts;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictionService;

    public PredictionsController(IPredictionService predictionService)
    {
        _predictionService = predictionService;
    }

    [HttpPost]
    [EnableRateLimiting("prediction")]
    [RequestTimeout("prediction")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 15 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PredictionResultDto>> Predict([FromForm] PredictRequest request, CancellationToken cancellationToken)
    {
        Guid? userId = null;
        var isAuthenticated = User.Identity?.IsAuthenticated == true;
        // Invalid credentials must not silently turn a user's request into an unsaved guest prediction.
        if (Request.Headers.ContainsKey("Authorization") && !isAuthenticated)
        {
            return Unauthorized();
        }

        if (isAuthenticated)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!Guid.TryParse(userIdClaim, out var parsedUserId)) return Unauthorized();
            userId = parsedUserId;
        }

        var result = await _predictionService.PredictAsync(request.File, userId, request.AgriculturalProfileId, cancellationToken);
        if (!userId.HasValue) return Ok(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<PagedResult<PredictionHistoryDto>>> GetHistory(
        [FromQuery] PredictionFilterParams filterParams,
        CancellationToken cancellationToken = default)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _predictionService.GetFilteredHistoryAsync(userId, filterParams, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PredictionResultDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();
        var result = await _predictionService.GetPredictionByIdAsync(id, cancellationToken, userId);
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:guid}/images/{imageId:guid}")]
    [EnableRateLimiting("image")]
    public async Task<IActionResult> ReadImage(Guid id, Guid imageId, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();
        var image = await _predictionService.ReadImageAsync(id, imageId, userId, cancellationToken);
        if (image == null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(image.Content, image.ContentType);
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
