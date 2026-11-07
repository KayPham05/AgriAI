using System.ComponentModel.DataAnnotations;
using System.Text;
using AgriVision.Application.Common.Interfaces.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("account-challenges")]
public sealed class PasswordRecoveryController(IPasswordRecovery recovery) : ControllerBase
{
    [HttpPost("forgot-password")]
    public async Task<IActionResult> RequestReset(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await recovery.RequestAsync(request.Email, cancellationToken);
        return Accepted();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        if (Encoding.UTF8.GetByteCount(request.Password) > 72)
            return BadRequest(new { message = "Mật khẩu vượt quá độ dài cho phép." });

        if (!await recovery.ResetAsync(request.Code, request.Password, cancellationToken))
            return BadRequest(new { message = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });

        return NoContent();
    }
}

public sealed record ForgotPasswordRequest(
    [Required, EmailAddress, StringLength(254)] string Email);

public sealed record ResetPasswordRequest(
    [Required, RegularExpression("^[a-fA-F0-9]{32}$")] string Code,
    [Required, StringLength(72, MinimumLength = 6)] string Password);
