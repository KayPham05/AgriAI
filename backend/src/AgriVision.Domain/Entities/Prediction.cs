namespace AgriVision.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public string ImagePath { get; set; } = string.Empty;
    public string? ImagePublicId { get; set; }
    public Guid PredictedPlantDiseaseId { get; set; }
    public double Confidence { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Null for legacy records whose original displayed result was not captured.
    public string? ResultSnapshotJson { get; set; }

    public User? User { get; set; }
    public PlantDisease PredictedPlantDisease { get; set; } = null!;
    public ICollection<PredictionDetail> PredictionDetails { get; set; } = new List<PredictionDetail>();
    public ICollection<PredictionImage> Images { get; set; } = new List<PredictionImage>();
}
