using System.Text.RegularExpressions;

namespace AgriVision.Application.Common.Interfaces.Services;

public static class ImageStorageKey
{
    private static readonly Regex LegacyKey = new(@"^r2/predictions/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$", RegexOptions.CultureInvariant);

    public static string Create(ImageStorageContext context, string extension)
    {
        if (context.UserId == Guid.Empty || context.PredictionId == Guid.Empty || context.ImageId == Guid.Empty)
            throw new ArgumentException("Image storage requires non-empty owner, prediction and image IDs.");
        if (extension is not (".jpg" or ".jpeg" or ".png"))
            throw new ArgumentException("Only JPEG and PNG images are supported.");
        return $"users/{context.UserId:D}/predictions/{context.PredictionId:D}/{context.ImageId:D}{extension}";
    }

    public static bool IsSupported(string? key)
    {
        if (key == null) return false;
        if (LegacyKey.IsMatch(key)) return true;
        var parts = key.Split('/');
        return parts.Length == 5 && parts[0] == "users" && parts[2] == "predictions" &&
            Guid.TryParseExact(parts[1], "D", out var user) && user != Guid.Empty &&
            Guid.TryParseExact(parts[3], "D", out var prediction) && prediction != Guid.Empty &&
            Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[4]), "D", out var image) && image != Guid.Empty &&
            Path.GetExtension(parts[4]) is ".jpg" or ".jpeg" or ".png" && key == key.ToLowerInvariant();
    }

    public static bool Matches(string? key, ImageStorageContext context) =>
        IsSupported(key) && (LegacyKey.IsMatch(key!) || key == Create(context, Path.GetExtension(key!)));
}
