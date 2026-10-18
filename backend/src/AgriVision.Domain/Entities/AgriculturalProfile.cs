namespace AgriVision.Domain.Entities;

public class AgriculturalProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public User User { get; set; } = null!;
    public ICollection<Prediction> Predictions { get; set; } = new List<Prediction>();
}
