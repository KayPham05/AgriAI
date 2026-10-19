namespace AgriVision.Domain.Entities;

public class Medicine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ProductName { get; set; } = string.Empty;
    public string ActiveIngredient { get; set; } = string.Empty;
    public string TargetUse { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string SafetyWarning { get; set; } = string.Empty;
    public string LabelReference { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public bool IsPublic { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<MedicineUse> Uses { get; set; } = new List<MedicineUse>();
}
