namespace AgriVision.Application.DTOs.AgriculturalProfile;

public record CreateAgriculturalProfileRequest(string Name, string? Description = null);

public record UpdateAgriculturalProfileRequest(string Name, string? Description = null);

public record AgriculturalProfileDto(
    Guid Id,
    Guid UserId,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int PredictionCount);
