using System.Security.Claims;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController, Route("api/users/notifications"), Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class NotificationsController(IAdminWorkspaceService workspace) : ControllerBase
{
    private Guid OwnerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpGet]
    public Task<PagedResult<UserNotificationDto>> List([FromQuery] AdminPageQuery query, CancellationToken ct) =>
        workspace.GetNotificationsAsync(OwnerId, query, ct);

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, CancellationToken ct)
    {
        await workspace.UpdateNotificationAsync(OwnerId, id, false, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Dismiss(Guid id, CancellationToken ct)
    {
        await workspace.UpdateNotificationAsync(OwnerId, id, true, ct);
        return NoContent();
    }

    [HttpPut("read")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        await workspace.UpdateAllNotificationsAsync(OwnerId, false, ct);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DismissAll(CancellationToken ct)
    {
        await workspace.UpdateAllNotificationsAsync(OwnerId, true, ct);
        return NoContent();
    }
}
