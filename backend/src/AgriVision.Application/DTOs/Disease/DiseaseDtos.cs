namespace AgriVision.Application.DTOs.Disease;

public record DiseaseDto(
    Guid Id,
    string Name,
    string? VietnameseName,
    string? Description,
    string? Symptoms,
    string? Treatment,
    string? Prevention,
    bool IsActive,
    DateTime CreatedAt
)
{
    // Older immutable snapshots do not contain this metadata.
    public bool? IsContentApproved { get; init; }
    public string? ConditionType { get; init; }
}

public record DiseaseApprovalRequest(bool IsContentApproved);

public record CreateDiseaseRequest(
    string Name,
    string? VietnameseName,
    string? Description,
    string? Symptoms,
    string? Treatment,
    string? Prevention,
    string? ConditionType = null
);

public record UpdateDiseaseRequest(
    string Name,
    string? VietnameseName,
    string? Description,
    string? Symptoms,
    string? Treatment,
    string? Prevention,
    bool IsActive,
    string? ConditionType = null
);
