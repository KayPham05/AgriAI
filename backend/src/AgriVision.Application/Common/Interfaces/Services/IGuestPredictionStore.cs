using AgriVision.Application.DTOs.Prediction;

namespace AgriVision.Application.Common.Interfaces.Services;

public interface IGuestPredictionStore
{
    PredictionResultDto Store(PredictionResultDto result, byte[] image, string fileName);
    GuestPrediction? Find(string token);
}

// Server-owned data only: callers cannot supply or modify the AI result when saving.
public sealed class GuestPrediction(PredictionResultDto result, byte[] image, string fileName, DateTime expiresAt)
{
    public PredictionResultDto Result { get; } = result;
    public byte[] Image { get; } = image;
    public string FileName { get; } = fileName;
    public DateTime ExpiresAt { get; } = expiresAt;
    public SemaphoreSlim Gate { get; } = new(1, 1);
    public Guid? OwnerId { get; set; }
    public bool IsSaved { get; set; }
}
