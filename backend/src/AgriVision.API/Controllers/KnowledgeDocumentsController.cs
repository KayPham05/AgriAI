using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/knowledge-documents")]
[AllowAnonymous]
public class KnowledgeDocumentsController(IKnowledgeDocumentService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<KnowledgeDocumentDto>>> List([FromQuery] CatalogFilterParams filter, CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(filter, true, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<KnowledgeDocumentDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await service.GetAsync(id, true, cancellationToken));
}
