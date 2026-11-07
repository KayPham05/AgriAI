using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.User;
using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Services.Interfaces;

public interface IUserAvatarService
{
    Task<UserProfileDto> UploadAsync(Guid userId, IFormFile file, CancellationToken cancellationToken = default);
    Task<ImageDownloadResult?> ReadAsync(Guid userId, string key, CancellationToken cancellationToken = default);
}
