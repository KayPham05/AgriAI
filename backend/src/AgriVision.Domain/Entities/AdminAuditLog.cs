namespace AgriVision.Domain.Entities;

public class AdminAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ActorUserId { get; set; }
    public Guid? TargetUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public User? ActorUser { get; set; }
    public User? TargetUser { get; set; }
}
