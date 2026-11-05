using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/auth/two-factor")]
[EnableRateLimiting("account-challenges")]
public sealed class TwoFactorController(
    IUserRepository users,
    IEmailTwoFactor twoFactor,
    IAuthService auth) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var user = await GetActiveUserAsync(cancellationToken);
        return user is null ? Unauthorized() : Ok(new { enabled = user.EmailTwoFactorEnabled });
    }

    [Authorize]
    [HttpPost("setup")]
    public async Task<IActionResult> BeginSetup(CancellationToken cancellationToken, bool enabled = true)
    {
        var user = await GetActiveUserAsync(cancellationToken);
        if (user is null)
            return Unauthorized();
        if (user.EmailTwoFactorEnabled == enabled)
            return Conflict();

        var challengeId = await twoFactor.IssueAsync(user,
            enabled ? "TwoFactorSetup" : "TwoFactorDisable", cancellationToken);
        return Ok(new { challengeId });
    }

    [Authorize]
    [HttpPost("setup/verify")]
    public async Task<IActionResult> VerifySetup(
        EmailChallengeRequest request, CancellationToken cancellationToken, bool enabled = true)
    {
        var user = await GetActiveUserAsync(cancellationToken);
        if (user is null)
            return Unauthorized();

        var verified = await twoFactor.VerifyAsync(request.ChallengeId, request.Code, user.Id, enabled, cancellationToken);
        return verified is null ? InvalidCode() : NoContent();
    }

    [HttpPost("login")]
    public async Task<IActionResult> VerifyLogin(EmailChallengeRequest request, CancellationToken cancellationToken)
    {
        var user = await twoFactor.VerifyAsync(request.ChallengeId, request.Code, null, null, cancellationToken);
        return user is null ? InvalidCode() : Ok(await auth.CompleteLoginAsync(user, cancellationToken));
    }

    private async Task<AgriVision.Domain.Entities.User?> GetActiveUserAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(subject, out var userId))
            return null;

        var user = await users.GetByIdAsync(userId, cancellationToken);
        return user is { IsActive: true } ? user : null;
    }

    private BadRequestObjectResult InvalidCode() =>
        BadRequest(new { message = "Mã xác minh không hợp lệ hoặc đã hết hạn." });
}

public sealed record EmailChallengeRequest(
    Guid ChallengeId,
    [Required, RegularExpression("^[0-9]{8}$")] string Code);
