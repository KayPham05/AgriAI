using System.Security.Claims;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _authService.LoginAsync(request, cancellationToken));
        }
        catch (TwoFactorRequiredException challenge)
        {
            return Accepted(new { challengeId = challenge.ChallengeId });
        }
    }

    [HttpPost("google")]
    [EnableRateLimiting("account-challenges")]
    public async Task<ActionResult<AuthResponse>> Google(
        GoogleLoginRequest request, [FromServices] IGoogleAccountLogin google, CancellationToken cancellationToken)
    {
        var user = await google.AuthenticateAsync(request.Credential, cancellationToken);
        try
        {
            return Ok(await _authService.LoginAccountAsync(user, cancellationToken));
        }
        catch (TwoFactorRequiredException challenge)
        {
            return Accepted(new { challengeId = challenge.ChallengeId });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var sidClaim = User.FindFirst("sid")?.Value ?? User.FindFirstValue("sid");
        if (string.IsNullOrEmpty(sidClaim) || !Guid.TryParse(sidClaim, out var sessionId))
        {
            return Unauthorized();
        }

        await _authService.LogoutAsync(userId, sessionId, cancellationToken);
        return NoContent();
    }
}

public sealed record GoogleLoginRequest([Required, StringLength(8192)] string Credential);
