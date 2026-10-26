using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/admin/knowledge-documents")]
[Authorize(Roles = UserRole.Admin)]
public class AdminKnowledgeDocumentsController(IKnowledgeDocumentService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<KnowledgeDocumentDto>>> List([FromQuery] CatalogFilterParams filter, CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(filter, false, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<KnowledgeDocumentDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetAsync(id, false, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<KnowledgeDocumentDto>> Create(CreateKnowledgeDocumentRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<KnowledgeDocumentDto>> Update(Guid id, UpdateKnowledgeDocumentRequest request, CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPut("{id:guid}/publication")]
    public async Task<ActionResult<KnowledgeDocumentDto>> Publish(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken) =>
        Ok(await service.PublishAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeactivateAsync(id, cancellationToken);
        return NoContent();
    }
}
