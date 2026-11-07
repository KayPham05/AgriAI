using System.Security.Claims;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using AgriVision.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/catalog/{kind}/{id:guid}/image")]
public class CatalogImagesController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Read(string kind, Guid id, [FromServices] ICatalogImageService images, CancellationToken ct)
    {
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var image = await images.ReadAsync(kind, id, User.IsInRole(UserRole.Admin), ct);
        return image == null ? NotFound() : File(image.Content, image.ContentType);
    }

    [HttpPut]
    [Authorize(Roles = UserRole.Admin)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(CatalogImageService.MaxBytes + 65536)]
    [RequestFormLimits(MultipartBodyLengthLimit = CatalogImageService.MaxBytes + 65536)]
    [EnableRateLimiting("image")]
    [RequestTimeout("prediction")]
    public async Task<ActionResult<CatalogImageDto>> Upload(string kind, Guid id, [FromForm] IFormFile file,
        [FromServices] ICatalogImageService images, CancellationToken ct) =>
        Ok(await images.UploadAsync(kind, id, ActorId(), file, ct));

    [HttpDelete]
    [Authorize(Roles = UserRole.Admin)]
    [EnableRateLimiting("image")]
    public async Task<IActionResult> Remove(string kind, Guid id, [FromServices] ICatalogImageService images, CancellationToken ct)
    {
        await images.RemoveAsync(kind, id, ActorId(), ct);
        return NoContent();
    }

    private Guid ActorId() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
        ? id : throw new UnauthorizedAccessException("Vui lòng đăng nhập lại.");
}
