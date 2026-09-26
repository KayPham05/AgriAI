namespace AgriVision.Domain.Entities;

public class PredictionDetail
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PredictionId { get; set; }
    public Guid PlantDiseaseId { get; set; }
    public double Probability { get; set; }
    public int Rank { get; set; }

    public Prediction Prediction { get; set; } = null!;
    public PlantDisease PlantDisease { get; set; } = null!;
}
