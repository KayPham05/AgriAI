namespace AgriVision.Domain.Entities;

public class MedicineUse
{
    public Guid MedicineId { get; set; }
    public Guid PlantDiseaseId { get; set; }
    public string LabelDirections { get; set; } = string.Empty;
    public bool IsLabelVerified { get; set; }
    public bool IsApproved { get; set; }
    public Medicine Medicine { get; set; } = null!;
    public PlantDisease PlantDisease { get; set; } = null!;
}
