namespace AgriVision.Domain.Entities;

public class PredictionImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PredictionId { get; set; }
    public int Position { get; set; }
    public string? ImagePath { get; set; }
    public string? ImagePublicId { get; set; }
    public double Confidence { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Prediction Prediction { get; set; } = null!;
}
