namespace AgriVision.Application.DTOs.Medicine;

public record CreateMedicineRequest(string ProductName, string ActiveIngredient, string? TargetUse,
    string SourceUrl, string SafetyWarning, string LabelReference);
public record UpdateMedicineRequest(string ProductName, string ActiveIngredient, string? TargetUse,
    string SourceUrl, string SafetyWarning, string LabelReference);
public record AssignMedicineUseRequest(string LabelDirections, bool? IsLabelVerified = null, bool? IsApproved = null);
public record MedicineUseDto(Guid PlantDiseaseId, string LabelDirections, bool IsLabelVerified, bool IsApproved);
public record MedicineDto(Guid Id, string ProductName, string ActiveIngredient, string TargetUse,
    string SourceUrl, string SafetyWarning, string LabelReference,
    bool IsApproved, bool IsPublic, bool IsActive, DateTime CreatedAt, DateTime UpdatedAt,
    IReadOnlyList<MedicineUseDto> Uses);
public record RecommendedMedicineDto(Guid MedicineId, Guid PlantDiseaseId, string ProductName,
    string ActiveIngredient, string TargetUse, string SourceUrl, string SafetyWarning,
    string LabelReference, string LabelDirections, DateTime UpdatedAt);
