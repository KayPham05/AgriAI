namespace AgriVision.Application.DTOs.Plant;

public record PlantDto(
    Guid Id,
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description,
    bool IsActive,
    DateTime CreatedAt
);

public record CreatePlantRequest(
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description
);

public record UpdatePlantRequest(
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description,
    bool IsActive
);
