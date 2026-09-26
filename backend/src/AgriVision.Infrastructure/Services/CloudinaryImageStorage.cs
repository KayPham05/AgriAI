using AgriVision.Application.Common.Interfaces.Services;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using AppImageUploadResult = AgriVision.Application.Common.Interfaces.Services.ImageUploadResult;

namespace AgriVision.Infrastructure.Services;

public class CloudinaryImageStorage : IImageStorage
{
    private readonly Cloudinary? _cloudinary;
    private readonly ILogger<CloudinaryImageStorage> _logger;

    public CloudinaryImageStorage(IConfiguration configuration, ILogger<CloudinaryImageStorage> logger)
    {
        _logger = logger;

        var cloudName = configuration["Cloudinary:CloudName"];
        var apiKey = configuration["Cloudinary:ApiKey"];
        var apiSecret = configuration["Cloudinary:ApiSecret"];

        if (!string.IsNullOrWhiteSpace(cloudName) &&
            !string.IsNullOrWhiteSpace(apiKey) &&
            !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }
    }

    public async Task<AppImageUploadResult> UploadImageAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        using var stream = file.OpenReadStream();
        return await UploadImageAsync(stream, file.FileName, cancellationToken);
    }

    public async Task<AppImageUploadResult> UploadImageAsync(Stream imageStream, string fileName, CancellationToken cancellationToken = default)
    {
        if (_cloudinary != null)
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, imageStream),
                Folder = "agrivision/predictions"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams, cancellationToken);
            if (uploadResult.Error == null)
            {
                return new AppImageUploadResult(uploadResult.PublicId, uploadResult.SecureUrl.ToString());
            }

            _logger.LogWarning("Cloudinary upload failed: {Error}. Falling back to local storage.", uploadResult.Error.Message);
        }

        // Local storage fallback
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "predictions");
        Directory.CreateDirectory(uploadsFolder);

        var fileExtension = Path.GetExtension(fileName);
        var publicId = $"local_{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, publicId);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            imageStream.Position = 0;
            await imageStream.CopyToAsync(fileStream, cancellationToken);
        }

        var relativeUrl = $"/uploads/predictions/{publicId}";
        return new AppImageUploadResult(publicId, relativeUrl);
    }

    public async Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
    {
        if (_cloudinary != null && !publicId.StartsWith("local_"))
        {
            var deletionParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deletionParams);
            return result.Result == "ok";
        }

        if (publicId.StartsWith("local_"))
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "predictions", publicId);
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                return true;
            }
        }

        return false;
    }
}
