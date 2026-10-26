namespace AgriVision.Application.DTOs.Knowledge;

public record CatalogFilterParams(Guid? PlantId = null, Guid? DiseaseId = null,
    string? Search = null, int PageNumber = 1, int PageSize = 20);

public record CatalogPublicationRequest(bool IsApproved, bool IsPublic, bool IsActive);

public record CreateKnowledgeDocumentRequest(string Title, string Content, string SourceUrl, IReadOnlyList<Guid> PlantDiseaseIds);
public record UpdateKnowledgeDocumentRequest(string Title, string Content, string SourceUrl, IReadOnlyList<Guid> PlantDiseaseIds);

public record KnowledgeDocumentDto(Guid Id, string Title, string Content, string SourceUrl,
    bool IsApproved, bool IsPublic, bool IsActive, DateTime CreatedAt, DateTime UpdatedAt,
    IReadOnlyList<Guid> PlantDiseaseIds);
