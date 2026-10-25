using System.Security.Claims;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http.Timeouts;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IUserAvatarService _avatars;

    public UsersController(IUserService userService, IUserAvatarService avatars)
    {
        _userService = userService;
        _avatars = avatars;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.GetProfileAsync(userId, cancellationToken);
        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var updated = await _userService.UpdateProfileAsync(userId, request, cancellationToken);
        return Ok(updated);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        await _userService.ChangePasswordAsync(userId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("avatar")]
    [EnableRateLimiting("prediction")]
    [RequestTimeout("prediction")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 15 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UserProfileDto>> UploadAvatar([FromForm] IFormFile file, CancellationToken cancellationToken) =>
        Ok(await _avatars.UploadAsync(GetCurrentUserId(), file, cancellationToken));

    [HttpGet("avatar/{*key}")]
    [EnableRateLimiting("image")]
    public async Task<IActionResult> ReadAvatar(string key, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var image = await _avatars.ReadAsync(GetCurrentUserId(), key, cancellationToken);
        return image == null ? NotFound() : File(image.Content, image.ContentType);
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
