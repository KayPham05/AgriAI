using System.ComponentModel.DataAnnotations;

namespace AgriVision.Application.DTOs.Admin;

public record AdminPageQuery(
    [StringLength(150)] string? Search = null,
    [Range(1, 1000000)] int PageNumber = 1,
    [Range(1, 100)] int PageSize = 10);
public record AdminImageDto(Guid Id, Guid PredictionId, Guid? UserId, string UserName, string UserEmail,
    string? ImageUrl, DateTime UploadedAt, DateTime ExpiresAt, string Status);
public record AdminSessionDto(Guid Id, Guid UserId, string UserName, string UserEmail,
    DateTime CreatedAt, DateTime ExpiresAt, DateTime? EndedAt, string Status);
public record WarningRequest([Required, StringLength(1000, MinimumLength = 1)] string Message);
public record UserNotificationDto(Guid Id, string Message, Guid? ImageId, DateTime CreatedAt, DateTime? ReadAt, string Kind);
