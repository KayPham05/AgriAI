using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "CurrentAdmin")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AdminController(IAdminRepository admin) : ControllerBase
{
    [HttpGet("summary")]
    public Task<AdminSummaryDto> Summary(CancellationToken cancellationToken) => admin.GetSummaryAsync(cancellationToken);

    [HttpGet("activity")]
    public Task<AdminActivityDto> Activity(CancellationToken cancellationToken) => admin.GetActivityAsync(cancellationToken);

    [HttpGet("users")]
    public Task<PagedResult<AdminUserDto>> Users([FromQuery] AdminPageQuery query, CancellationToken cancellationToken) =>
        admin.GetUsersAsync(query.PageNumber, query.PageSize, query.Q, cancellationToken);

    [HttpGet("images")]
    public Task<PagedResult<AdminImageDto>> Images([FromQuery] AdminPageQuery query, CancellationToken cancellationToken) =>
        admin.GetImagesAsync(query.PageNumber, query.PageSize, query.Q, query.UserId, cancellationToken);

    [HttpGet("sessions")]
    public Task<PagedResult<AdminSessionDto>> Sessions([FromQuery] AdminPageQuery query, CancellationToken cancellationToken) =>
        admin.GetSessionsAsync(query.PageNumber, query.PageSize, query.Q, query.UserId, cancellationToken);

    [HttpPut("users/{id:guid}/lock")]
    public async Task<IActionResult> SetLock(Guid id, LockAccountRequest request, CancellationToken cancellationToken)
    {
        await admin.SetLockAsync(id, request.IsLocked, request.Reason, cancellationToken);
        return NoContent();
    }

    [HttpPost("users/{id:guid}/logout-all")]
    public async Task<IActionResult> RevokeSessions(Guid id, CancellationToken cancellationToken)
    {
        await admin.RevokeSessionsAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("users/{id:guid}/warnings")]
    public async Task<IActionResult> WarnUser(Guid id, WarningRequest request, CancellationToken cancellationToken)
    {
        await admin.WarnUserAsync(id, CurrentAdminId(), request.Message, cancellationToken);
        return NoContent();
    }

    [HttpPost("images/{id:guid}/warnings")]
    public async Task<IActionResult> WarnImage(Guid id, WarningRequest request, CancellationToken cancellationToken)
    {
        await admin.WarnImageAsync(id, CurrentAdminId(), request.Message, cancellationToken);
        return NoContent();
    }

    [HttpDelete("images/{id:guid}")]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken cancellationToken)
    {
        await admin.DeleteImageAsync(id, cancellationToken);
        return NoContent();
    }

    private Guid CurrentAdminId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
}

public record LockAccountRequest(bool IsLocked, [StringLength(500)] string? Reason);
public record WarningRequest([Required, StringLength(1000, MinimumLength = 1)] string Message);

public class AdminPageQuery
{
    [Range(1, 1000000)] public int PageNumber { get; set; } = 1;
    [Range(1, 100)] public int PageSize { get; set; } = 10;
    [StringLength(150)] public string? Q { get; set; }
    public Guid? UserId { get; set; }
}
