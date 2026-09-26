namespace AgriVision.Domain.Entities;

public class Plant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? VietnameseName { get; set; }
    public string? ScientificName { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<PlantDisease> PlantDiseases { get; set; } = new List<PlantDisease>();
}
