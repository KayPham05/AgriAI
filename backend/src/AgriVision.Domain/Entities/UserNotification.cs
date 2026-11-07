namespace AgriVision.Domain.Entities;

public class UserNotification
{
    public string Kind { get; set; } = "Warning";
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? ActorUserId { get; set; }
    public Guid? ImageId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public DateTime? DismissedAt { get; set; }
    public User User { get; set; } = null!;
}
