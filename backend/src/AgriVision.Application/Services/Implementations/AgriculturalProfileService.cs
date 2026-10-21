using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.AgriculturalProfile;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class AgriculturalProfileService : IAgriculturalProfileService
{
    private readonly IAgriculturalProfileRepository _profileRepository;

    public AgriculturalProfileService(IAgriculturalProfileRepository profileRepository)
    {
        _profileRepository = profileRepository;
    }

    public Task<IReadOnlyList<AgriculturalProfileDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _profileRepository.GetByUserIdAsync(userId, cancellationToken);

    public async Task<AgriculturalProfileDto> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await GetOwnedProfileAsync(id, userId, cancellationToken);
        var count = await _profileRepository.GetPredictionCountAsync(id, cancellationToken);
        return MapToDto(profile, count);
    }

    public async Task<AgriculturalProfileDto> CreateAsync(Guid userId, CreateAgriculturalProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = new AgriculturalProfile
        {
            UserId = userId,
            Name = ValidateName(request.Name),
            Description = NormalizeDescription(request.Description)
        };
        await _profileRepository.AddAsync(profile, cancellationToken);
        return MapToDto(profile, 0);
    }

    public async Task<AgriculturalProfileDto> UpdateAsync(Guid id, Guid userId, UpdateAgriculturalProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = await GetOwnedProfileAsync(id, userId, cancellationToken);
        profile.Name = ValidateName(request.Name);
        profile.Description = NormalizeDescription(request.Description);
        profile.UpdatedAt = DateTime.UtcNow;
        await _profileRepository.UpdateAsync(profile, cancellationToken);
        var count = await _profileRepository.GetPredictionCountAsync(id, cancellationToken);
        return MapToDto(profile, count);
    }

    public async Task DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await GetOwnedProfileAsync(id, userId, cancellationToken);
        // The existing database FK sets prediction profile IDs to NULL, retaining history and images.
        await _profileRepository.DeleteAsync(profile, cancellationToken);
    }

    private async Task<AgriculturalProfile> GetOwnedProfileAsync(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        var profile = await _profileRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null || profile.UserId != userId)
            throw new KeyNotFoundException("Agricultural profile not found.");
        return profile;
    }

    private static string ValidateName(string? name)
    {
        var trimmedName = name?.Trim();
        if (string.IsNullOrEmpty(trimmedName) || trimmedName.Length > 150)
            throw new ArgumentException("Profile name must contain between 1 and 150 characters.");
        return trimmedName;
    }

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();

    private static AgriculturalProfileDto MapToDto(AgriculturalProfile profile, int predictionCount) =>
        new(profile.Id, profile.UserId, profile.Name, profile.Description,
            profile.CreatedAt, profile.UpdatedAt, predictionCount);
}
