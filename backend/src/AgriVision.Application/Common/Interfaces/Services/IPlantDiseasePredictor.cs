using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Common.Interfaces.Services;

public record AiPredictionTopKItem(int ClassIndex, string ClassName, float Confidence);

public record AiPredictionResult(
    int ClassIndex,
    string ClassName,
    float Confidence,
    IEnumerable<AiPredictionTopKItem> TopK
);

public interface IPlantDiseasePredictor
{
    Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<AiPredictionResult> PredictAsync(Stream imageStream, string fileName, CancellationToken cancellationToken = default);
}
