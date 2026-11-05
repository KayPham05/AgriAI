using System.Security.Claims;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriVision.API.Controllers;

[ApiController, Route("api/admin"), Authorize(Roles = UserRole.Admin)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AdminWorkspaceController(IAdminWorkspaceService workspace) : ControllerBase
{
    private Guid ActorId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpGet("images")]
    public Task<PagedResult<AdminImageDto>> Images([FromQuery] AdminPageQuery query, CancellationToken ct) => workspace.GetImagesAsync(query, ct);

    [HttpGet("sessions")]
    public Task<PagedResult<AdminSessionDto>> Sessions([FromQuery] AdminPageQuery query, CancellationToken ct) => workspace.GetSessionsAsync(query, ct);

    [HttpPost("users/{id:guid}/warnings")]
    public async Task<IActionResult> WarnUser(Guid id, WarningRequest request, CancellationToken ct)
    {
        await workspace.WarnAsync(ActorId, id, null, request.Message, ct);
        return NoContent();
    }

    [HttpPost("images/{id:guid}/warnings")]
    public async Task<IActionResult> WarnImage(Guid id, WarningRequest request, CancellationToken ct)
    {
        await workspace.WarnAsync(ActorId, null, id, request.Message, ct);
        return NoContent();
    }

    [HttpPost("users/{id:guid}/logout-all")]
    public async Task<IActionResult> LogoutAll(Guid id, CancellationToken ct)
    {
        await workspace.LogoutAllAsync(ActorId, id, ct);
        return NoContent();
    }

    [HttpGet("images/{id:guid}/content"), EnableRateLimiting("image")]
    public async Task<IActionResult> ReadImage(Guid id, [FromServices] IAdminImageService images, CancellationToken ct)
    {
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var image = await images.ReadAsync(id, ct);
        return image == null ? NotFound() : File(image.Content, image.ContentType);
    }

    [HttpDelete("images/{id:guid}")]
    public async Task<IActionResult> DeleteImage(Guid id, [FromServices] IAdminImageService images, CancellationToken ct)
    {
        await images.DeleteAsync(ActorId, id, ct);
        return NoContent();
    }
}
