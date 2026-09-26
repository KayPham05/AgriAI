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

    public User? User { get; set; }
    public PlantDisease PredictedPlantDisease { get; set; } = null!;
    public ICollection<PredictionDetail> PredictionDetails { get; set; } = new List<PredictionDetail>();
}
