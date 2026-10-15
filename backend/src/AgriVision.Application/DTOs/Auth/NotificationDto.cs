namespace AgriVision.Application.DTOs.Auth;

public record NotificationDto(Guid Id, string Title, string Message, DateTime CreatedAt, DateTime? ReadAt, Guid? ImageId);
