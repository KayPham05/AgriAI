using System.Collections.Concurrent;
using AgriVision.Application.Common.Interfaces.Services;
using Microsoft.AspNetCore.Http;

namespace AgriVision.ApiTests.Helpers;

internal sealed class PredictDouble : IPlantDiseasePredictor
{
    public int Calls;
    public Func<CancellationToken, Task<AiPredictionResult>> Run { get; set; } = _ => Task.FromResult(new AiPredictionResult(0, "Ca_chua___Chay_la_som", .94f, [new(0, "Ca_chua___Chay_la_som", .94f)]));
    public Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default) => PredictAsync(Stream.Null, file.FileName, cancellationToken);
    public Task<AiPredictionResult> PredictAsync(Stream stream, string name, CancellationToken cancellationToken = default)
    {
        Interlocked.Increment(ref Calls);
        return Run(cancellationToken);
    }
}

internal sealed class StorageDouble : IImageStorage
{
    public int Uploads;
    public bool FailUpload { get; set; }
    public bool Missing { get; set; }
    public ConcurrentDictionary<string, byte[]> Objects { get; } = new();
    public async Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default)
    {
        await using var stream = file.OpenReadStream();
        return await UploadImageAsync(stream, file.FileName, context, cancellationToken);
    }
    public async Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, ImageStorageContext context, CancellationToken cancellationToken = default)
    {
        Interlocked.Increment(ref Uploads);
        if (FailUpload) throw new AgriVision.Infrastructure.Services.ImageStorageException("Synthetic storage outage");
        using var bytes = new MemoryStream();
        await stream.CopyToAsync(bytes, cancellationToken);
        var key = ImageStorageKey.Create(context, Path.GetExtension(name).ToLowerInvariant());
        Objects[key] = bytes.ToArray();
        return new(key, string.Empty);
    }
    public Task<ImageDownloadResult?> ReadImageAsync(string key, CancellationToken cancellationToken = default) => Task.FromResult<ImageDownloadResult?>(!Missing && Objects.TryGetValue(key, out var bytes) ? new(bytes, key.EndsWith(".png") ? "image/png" : "image/jpeg") : null);
    public Task<bool> DeleteImageAsync(string key, CancellationToken cancellationToken = default)
    {
        Objects.TryRemove(key, out _);
        return Task.FromResult(true);
    }
}
