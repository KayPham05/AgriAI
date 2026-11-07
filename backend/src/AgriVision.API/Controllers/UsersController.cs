using System.Security.Claims;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
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
    private readonly IEmailTwoFactor _twoFactor;
    private readonly IUserRepository _users;

    public UsersController(IUserService userService, IUserAvatarService avatars, IEmailTwoFactor twoFactor, IUserRepository users)
    {
        _userService = userService;
        _avatars = avatars;
        _twoFactor = twoFactor;
        _users = users;
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
        if (request.VerificationChallengeId is null || string.IsNullOrWhiteSpace(request.VerificationCode))
            return BadRequest(new { message = "Vui lòng xác minh mã được gửi đến email trước khi đổi mật khẩu." });
        if (await _twoFactor.VerifyPasswordChangeAsync(request.VerificationChallengeId.Value,
                request.VerificationCode, userId, cancellationToken) is null)
            return BadRequest(new { message = "Mã xác minh không hợp lệ hoặc đã hết hạn." });
        await _userService.ChangePasswordAsync(userId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("change-password/code")]
    public async Task<IActionResult> RequestPasswordChangeCode(CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(GetCurrentUserId(), cancellationToken);
        if (user is not { IsActive: true }) return Unauthorized();
        try
        {
            return Ok(new { challengeId = await _twoFactor.IssueAsync(user, "PasswordChange", cancellationToken) });
        }
        catch (InvalidOperationException exception) when (exception.Message.Contains("đợi 30 giây", StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = exception.Message
            });
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP và thử lại."
            });
        }
    }

    [HttpPost("change-password/code/resend")]
    public async Task<IActionResult> ResendPasswordChangeCode([FromBody] ResendCodeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var challengeId = await _twoFactor.ResendAsync(request.ChallengeId, GetCurrentUserId(), "PasswordChange", cancellationToken);
            return challengeId is null ? BadRequest(new { message = "Mã xác minh không hợp lệ hoặc đã hết hạn." }) : Ok(new { challengeId });
        }
        catch (InvalidOperationException exception) when (exception.Message.Contains("đợi 30 giây", StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = exception.Message });
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP và thử lại."
            });
        }
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

public sealed record ResendCodeRequest(Guid ChallengeId);
