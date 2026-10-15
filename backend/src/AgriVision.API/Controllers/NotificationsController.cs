using System.Security.Claims;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController, Route("api/notifications"), Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class NotificationsController(INotificationRepository notifications) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpGet]
    public Task<IReadOnlyList<NotificationDto>> Get(CancellationToken cancellationToken) => notifications.GetAsync(UserId, cancellationToken);

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkRead(CancellationToken cancellationToken)
    {
        await notifications.MarkReadAsync(UserId, cancellationToken);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Dismiss(CancellationToken cancellationToken)
    {
        await notifications.DismissAsync(UserId, cancellationToken);
        return NoContent();
    }
}
