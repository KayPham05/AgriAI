using System.Security.Claims;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/admin/catalog")]
[Authorize(Roles = UserRole.Admin)]
public class CatalogDeletionController(ICatalogDeletionService service) : ControllerBase
{
    [HttpDelete("{kind}/{id:guid}")]
    public async Task<IActionResult> Delete(string kind, Guid id, CancellationToken cancellationToken)
    {
        var actor = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await service.DeleteAsync(kind, id, actor, cancellationToken);
        return NoContent();
    }
}
