namespace AgriVision.Domain.Entities;

public class PlantDisease
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlantId { get; set; }
    public Guid DiseaseId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int ClassIndex { get; set; }
    public bool IsActive { get; set; } = true;

    public Plant Plant { get; set; } = null!;
    public Disease Disease { get; set; } = null!;
    public ICollection<Prediction> Predictions { get; set; } = new List<Prediction>();
    public ICollection<PredictionDetail> PredictionDetails { get; set; } = new List<PredictionDetail>();
}
