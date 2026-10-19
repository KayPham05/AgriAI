using System.Security.Claims;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = UserRole.Admin)]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminUserListItemDto>>> GetUsers(
        [FromQuery] AdminUserFilterParams filterParams,
        CancellationToken cancellationToken)
    {
        var result = await _adminUserService.GetUsersAsync(filterParams, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminUserListItemDto>> GetUserById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _adminUserService.GetUserByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<AdminUserListItemDto>> UpdateStatus(
        Guid id,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var adminId = GetCurrentUserId();
        var result = await _adminUserService.SetUserStatusAsync(adminId, id, request.IsActive, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}/role")]
    public async Task<ActionResult<AdminUserListItemDto>> UpdateRole(
        Guid id,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var adminId = GetCurrentUserId();
        var result = await _adminUserService.SetUserRoleAsync(adminId, id, request.Role, cancellationToken);
        return Ok(result);
    }

    [HttpGet("audit-logs")]
    [HttpGet("~/api/admin/audit-logs")]
    public async Task<ActionResult<PagedResult<AdminAuditLogDto>>> GetAuditLogs(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _adminUserService.GetAuditLogsAsync(pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");
        }
        return userId;
    }
}
