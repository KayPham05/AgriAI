namespace AgriVision.Domain.Entities;

public class PendingImageUpload
{
    public string Key { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
