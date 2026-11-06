using System.Security.Cryptography;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Prediction;

namespace AgriVision.Infrastructure.Services;

// One-process, bounded temporary storage. No guest image is written to disk, DB or R2.
public sealed class GuestPredictionStore : IGuestPredictionStore, IDisposable
{
    private const long MaxBytes = 128 * 1024 * 1024;
    private const int MaxEntries = 256;
    private readonly object _gate = new();
    private readonly Dictionary<string, GuestPrediction> _entries = new();
    private readonly Timer _cleanup;
    private long _bytes;

    public GuestPredictionStore() => _cleanup = new Timer(_ =>
    {
        lock (_gate) RemoveExpired();
    }, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));

    public PredictionResultDto Store(PredictionResultDto result, byte[] image, string fileName)
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var expiresAt = DateTime.UtcNow.AddHours(1);
        var snapshot = result with { PredictionDetails = result.PredictionDetails.ToArray() };
        lock (_gate)
        {
            RemoveExpired();
            while (_entries.Count >= MaxEntries || _bytes + image.Length > MaxBytes)
                Remove(_entries.MinBy(item => item.Value.ExpiresAt).Key);
            _entries.Add(token, new GuestPrediction(snapshot, image, fileName, expiresAt));
            _bytes += image.Length;
        }
        return snapshot with { GuestToken = token, GuestExpiresAt = expiresAt };
    }

    public GuestPrediction? Find(string token)
    {
        if (string.IsNullOrEmpty(token) || token.Length != 64) return null;
        lock (_gate)
        {
            RemoveExpired();
            return _entries.GetValueOrDefault(token);
        }
    }

    private void RemoveExpired()
    {
        foreach (var key in _entries.Where(item => item.Value.ExpiresAt <= DateTime.UtcNow).Select(item => item.Key).ToArray())
            Remove(key);
    }

    private void Remove(string key)
    {
        if (_entries.Remove(key, out var entry)) _bytes -= entry.Image.Length;
    }

    public void Dispose() => _cleanup.Dispose();
}
