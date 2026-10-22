using AgriVision.Application.DTOs.AgriculturalProfile;

namespace AgriVision.Application.Services.Interfaces;

public interface IAgriculturalProfileService
{
    Task<IReadOnlyList<AgriculturalProfileDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AgriculturalProfileDto> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<AgriculturalProfileDto> CreateAsync(Guid userId, CreateAgriculturalProfileRequest request, CancellationToken cancellationToken = default);
    Task<AgriculturalProfileDto> UpdateAsync(Guid id, Guid userId, UpdateAgriculturalProfileRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}
