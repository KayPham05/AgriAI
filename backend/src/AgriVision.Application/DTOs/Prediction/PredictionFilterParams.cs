namespace AgriVision.Application.DTOs.Prediction;

public record PredictionFilterParams(
    Guid? AgriculturalProfileId = null,
    Guid? PlantId = null,
    Guid? DiseaseId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int PageNumber = 1,
    int PageSize = 10
);
