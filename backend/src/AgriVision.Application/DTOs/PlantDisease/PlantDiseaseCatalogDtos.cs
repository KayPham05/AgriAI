namespace AgriVision.Application.DTOs.PlantDisease;

public record PlantDiseaseLookupDto(Guid Id, Guid PlantId, Guid DiseaseId, string PlantName,
    string DiseaseName, string ClassName, int ClassIndex, bool IsActive);
public record PlantDiseaseAvailabilityRequest(bool IsActive);
