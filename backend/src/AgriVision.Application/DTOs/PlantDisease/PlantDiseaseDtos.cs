using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.DTOs.Plant;

namespace AgriVision.Application.DTOs.PlantDisease;

public record PlantDiseaseDto(
    Guid Id,
    Guid PlantId,
    Guid DiseaseId,
    string ClassName,
    int ClassIndex,
    bool IsActive,
    PlantDto Plant,
    DiseaseDto Disease
);

public record CreatePlantDiseaseRequest(
    Guid PlantId,
    Guid DiseaseId,
    string ClassName,
    int ClassIndex
);
