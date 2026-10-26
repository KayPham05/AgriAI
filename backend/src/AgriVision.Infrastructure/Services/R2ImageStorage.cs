using System.Net;
using AgriVision.Application.Common.Interfaces.Services;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace AgriVision.Infrastructure.Services;

public sealed class R2ImageStorage(IAmazonS3 client, IConfiguration configuration) : IImageStorage
{
    private string Bucket => configuration["R2:BucketName"]
        ?? throw new ImageStorageException("R2 storage is not configured.");

    public async Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default)
    {
        await using var stream = file.OpenReadStream();
        return await UploadImageAsync(stream, file.FileName, context, cancellationToken);
    }

    public async Task<ImageUploadResult> UploadImageAsync(Stream imageStream, string fileName, ImageStorageContext context, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => throw new ArgumentException("Only JPEG and PNG images are supported.")
        };
        var key = ImageStorageKey.Create(context, extension);
        try
        {
            await client.PutObjectAsync(new PutObjectRequest
            {
                BucketName = Bucket, Key = key, InputStream = imageStream,
                ContentType = contentType, AutoCloseStream = false,
                // R2 does not support the SDK's streaming SigV4 payload/checksum mode.
                DisablePayloadSigning = true, DisableDefaultChecksumValidation = true,
                UseChunkEncoding = false
            }, cancellationToken);
            return new ImageUploadResult(key, string.Empty);
        }
        catch (AmazonS3Exception) { throw new ImageStorageException("Image upload failed. Please try again."); }
        catch (HttpRequestException) { throw new ImageStorageException("Image storage is unavailable. Please try again."); }
    }

    public async Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default)
    {
        ValidateKey(publicId);
        try
        {
            using var response = await client.GetObjectAsync(new GetObjectRequest { BucketName = Bucket, Key = publicId }, cancellationToken);
            const int maxBytes = 15 * 1024 * 1024;
            if (response.ContentLength > maxBytes) throw new ImageStorageException("Stored image exceeds the size limit.");
            using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await response.ResponseStream.ReadAsync(chunk, cancellationToken)) != 0)
            {
                if (buffer.Length + read > maxBytes) throw new ImageStorageException("Stored image exceeds the size limit.");
                await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
            }
            return new ImageDownloadResult(buffer.ToArray(), publicId.EndsWith(".png", StringComparison.Ordinal) ? "image/png" : "image/jpeg");
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == HttpStatusCode.NotFound) { return null; }
        catch (AmazonS3Exception) { throw new ImageStorageException("Image storage is unavailable. Please try again."); }
        catch (HttpRequestException) { throw new ImageStorageException("Image storage is unavailable. Please try again."); }
    }

    public async Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
    {
        ValidateKey(publicId);
        try
        {
            await client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = Bucket, Key = publicId }, cancellationToken);
            return true;
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == HttpStatusCode.NotFound) { return true; }
        catch (AmazonS3Exception) { throw new ImageStorageException("Image deletion failed. Please try again."); }
        catch (HttpRequestException) { throw new ImageStorageException("Image storage is unavailable. Please try again."); }
    }

    private static void ValidateKey(string key)
    {
        if (!ImageStorageKey.IsSupported(key))
            throw new ImageStorageException("This image must be migrated to R2 before it can be accessed or deleted.");
    }
}
