using System.Text.RegularExpressions;

namespace AgriVision.Application.Common.Interfaces.Services;

public static class ImageStorageKey
{
    public const string AvatarUrlPrefix = "/api/users/avatar/";
    private static readonly Regex LegacyKey = new(@"^r2/predictions/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$", RegexOptions.CultureInvariant);

    public static string Create(ImageStorageContext context, string extension)
    {
        if (context.CatalogKind != null)
        {
            if (context.IsAvatar || context.CatalogKind is not ("plants" or "diseases") ||
                context.CatalogId is null || context.CatalogId == Guid.Empty || context.UserId == Guid.Empty ||
                context.ImageId == Guid.Empty || extension is not (".jpg" or ".jpeg" or ".png"))
                throw new ArgumentException("Invalid catalog image context.");
            return $"category/{(context.CatalogKind == "plants" ? "plant" : "disease")}/{context.CatalogId:D}/{context.UserId:D}/{context.ImageId:D}{extension}";
        }
        if (context.UserId == Guid.Empty || (!context.IsAvatar && context.PredictionId == Guid.Empty) || context.ImageId == Guid.Empty)
            throw new ArgumentException("Image storage requires non-empty owner, prediction and image IDs.");
        if (extension is not (".jpg" or ".jpeg" or ".png"))
            throw new ArgumentException("Only JPEG and PNG images are supported.");
        return context.IsAvatar
            ? $"users/{context.UserId:D}/avatars/{context.ImageId:D}{extension}"
            : $"users/{context.UserId:D}/predictions/{context.PredictionId:D}/{context.ImageId:D}{extension}";
    }

    public static bool IsSupported(string? key)
    {
        if (key == null) return false;
        if (LegacyKey.IsMatch(key)) return true;
        var parts = key.Split('/');
        if (parts.Length == 5 && parts[0] == "category" && parts[1] is "plant" or "disease")
            return Guid.TryParseExact(parts[2], "D", out var record) && record != Guid.Empty &&
                Guid.TryParseExact(parts[3], "D", out var admin) && admin != Guid.Empty &&
                Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[4]), "D", out var photo) && photo != Guid.Empty &&
                Path.GetExtension(parts[4]) is ".jpg" or ".jpeg" or ".png" && key == key.ToLowerInvariant();
        if (parts.Length == 6 && parts[0] == "users" && parts[2] == "catalog" && parts[3] is "plants" or "diseases")
            return Guid.TryParseExact(parts[1], "D", out var catalogOwner) && catalogOwner != Guid.Empty &&
                Guid.TryParseExact(parts[4], "D", out var catalogId) && catalogId != Guid.Empty &&
                Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[5]), "D", out var catalogImage) && catalogImage != Guid.Empty &&
                Path.GetExtension(parts[5]) is ".jpg" or ".jpeg" or ".png" && key == key.ToLowerInvariant();
        if (parts.Length == 4 && parts[0] == "users" && parts[2] == "avatars")
            return Guid.TryParseExact(parts[1], "D", out var owner) && owner != Guid.Empty &&
                Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[3]), "D", out var avatar) && avatar != Guid.Empty &&
                Path.GetExtension(parts[3]) is ".jpg" or ".jpeg" or ".png" && key == key.ToLowerInvariant();
        return parts.Length == 5 && parts[0] == "users" && parts[2] == "predictions" &&
            Guid.TryParseExact(parts[1], "D", out var user) && user != Guid.Empty &&
            Guid.TryParseExact(parts[3], "D", out var prediction) && prediction != Guid.Empty &&
            Guid.TryParseExact(Path.GetFileNameWithoutExtension(parts[4]), "D", out var image) && image != Guid.Empty &&
            Path.GetExtension(parts[4]) is ".jpg" or ".jpeg" or ".png" && key == key.ToLowerInvariant();
    }

    public static bool Matches(string? key, ImageStorageContext context) =>
        IsSupported(key) && (LegacyKey.IsMatch(key!) || key == Create(context, Path.GetExtension(key!)));

    public static bool IsAvatarForUser(string? key, Guid owner) =>
        IsSupported(key) && key!.StartsWith($"users/{owner:D}/avatars/", StringComparison.Ordinal);

    public static bool IsCatalogImage(string? key, string kind, Guid id)
    {
        if (!IsSupported(key)) return false;
        var parts = key!.Split('/');
        return (parts.Length == 6 && parts[2] == "catalog" && parts[3] == kind && parts[4] == id.ToString("D")) ||
            (parts.Length == 5 && parts[0] == "category" && kind is "plants" or "diseases" &&
             parts[1] == (kind == "plants" ? "plant" : "disease") && parts[2] == id.ToString("D"));
    }
}
