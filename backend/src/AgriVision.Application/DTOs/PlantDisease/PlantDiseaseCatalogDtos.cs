namespace AgriVision.Application.DTOs.PlantDisease;

public record PlantDiseaseLookupDto(Guid Id, Guid PlantId, Guid DiseaseId, string PlantName,
    string DiseaseName, string ClassName, int ClassIndex, bool IsActive)
{
    public string ConditionType { get; init; } = "Unknown";
    public bool PlantIsActive { get; init; }
    public bool DiseaseIsActive { get; init; }
}
public record PlantDiseaseAvailabilityRequest(bool IsActive);
