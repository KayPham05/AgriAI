using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

internal static class CatalogValidation
{
    public static string Text(string? value, string field, int? maxLength = null)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed) || (maxLength.HasValue && trimmed.Length > maxLength))
            throw new ArgumentException($"{field} is required" + (maxLength.HasValue ? $" and must not exceed {maxLength} characters." : "."));
        return trimmed;
    }

    public static string Source(string? value)
    {
        var source = Text(value, "SourceUrl");
        if (!Uri.TryCreate(source, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp) || string.IsNullOrEmpty(uri.Host) || !string.IsNullOrEmpty(uri.UserInfo))
            throw new ArgumentException("SourceUrl must be an absolute HTTP(S) URL without credentials.");
        return source;
    }

    public static void Filter(CatalogFilterParams filter)
    {
        if (filter.PageNumber < 1 || filter.PageSize < 1 || filter.PageSize > 100 ||
            (long)(filter.PageNumber - 1) * filter.PageSize > int.MaxValue)
            throw new ArgumentException("PageNumber must be positive and PageSize must be between 1 and 100.");
        if (filter.PlantId == Guid.Empty || filter.DiseaseId == Guid.Empty)
            throw new ArgumentException("Filter IDs must not be empty.");
    }

    public static void Publication(CatalogPublicationRequest request)
    {
        if (request.IsPublic && (!request.IsApproved || !request.IsActive))
            throw new ArgumentException("Only approved and active content can be public.");
    }

    public static bool ActivePair(PlantDisease pair) => pair.IsActive && pair.Plant.IsActive && pair.Disease.IsActive;
}
