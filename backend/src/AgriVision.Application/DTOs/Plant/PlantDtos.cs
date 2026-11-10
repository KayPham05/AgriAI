namespace AgriVision.Application.DTOs.Plant;

public record PlantDto(
    Guid Id,
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    string Category = AgriVision.Domain.Enums.PlantCategory.Other,
    string? ImageUrl = null
);

public record CreatePlantRequest(
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description,
    string? Category = null
);

public record UpdatePlantRequest(
    string Name,
    string? VietnameseName,
    string? ScientificName,
    string? Description,
    bool IsActive,
    string? Category = null
);
