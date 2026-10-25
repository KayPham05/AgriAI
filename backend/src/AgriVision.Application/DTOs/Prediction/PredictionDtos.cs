using Microsoft.AspNetCore.Http;
using AgriVision.Application.DTOs.PlantDisease;
using AgriVision.Application.DTOs.Medicine;

namespace AgriVision.Application.DTOs.Prediction;

public class PredictRequest
{
    public required IFormFile File { get; init; }
    public Guid? AgriculturalProfileId { get; init; }
}

public record PredictionDetailDto(
    int ClassIndex,
    string ClassName,
    double Confidence,
    PlantDiseaseDto? PlantDisease
);

public record PredictionResultDto(
    Guid Id,
    string ImagePath,
    string? ImagePublicId,
    PlantDiseaseDto PredictedPlantDisease,
    double Confidence,
    IEnumerable<PredictionDetailDto> PredictionDetails,
    DateTime CreatedAt
)
{
    public IReadOnlyList<PredictionImageDto> Images { get; init; } = [];
    public bool HasHistoricalSnapshot { get; init; }
    public string? Warning { get; init; }
    public bool InformationPending { get; init; }
    public string? Medication { get; init; }
    public IReadOnlyList<RecommendedMedicineDto> RecommendedMedicines { get; init; } = [];
    public Guid? AgriculturalProfileId { get; init; }
}

public record PredictionImageDto(Guid Id, string? ImagePath, double Confidence, DateTime ExpiresAt, bool IsExpired);

public record PredictionHistoryDto(
    Guid Id,
    string ImagePath,
    string PlantName,
    string PlantVietnameseName,
    string DiseaseName,
    string DiseaseVietnameseName,
    double Confidence,
    DateTime CreatedAt
)
{
    public Guid? AgriculturalProfileId { get; init; }
    public bool HasHistoricalSnapshot { get; init; }
    public IReadOnlyList<PredictionImageDto> Images { get; init; } = [];
}
