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
);

public record CreateDiseaseRequest(
    string Name,
    string? VietnameseName,
    string? Description,
    string? Symptoms,
    string? Treatment,
    string? Prevention
);

public record UpdateDiseaseRequest(
    string Name,
    string? VietnameseName,
    string? Description,
    string? Symptoms,
    string? Treatment,
    string? Prevention,
    bool IsActive
);
