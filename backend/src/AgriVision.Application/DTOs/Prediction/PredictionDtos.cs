using Microsoft.AspNetCore.Http;
using AgriVision.Application.DTOs.PlantDisease;

namespace AgriVision.Application.DTOs.Prediction;

public class PredictRequest
{
    public required IFormFile File { get; set; }
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
);

public record PredictionHistoryDto(
    Guid Id,
    string ImagePath,
    string PlantName,
    string PlantVietnameseName,
    string DiseaseName,
    string DiseaseVietnameseName,
    double Confidence,
    DateTime CreatedAt
);
