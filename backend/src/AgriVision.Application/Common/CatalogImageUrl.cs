namespace AgriVision.Application.Common;

public static class CatalogImageUrl
{
    public static string? Create(string kind, Guid id, string? key) => string.IsNullOrEmpty(key)
        ? null : $"/api/catalog/{kind}/{id:D}/image?v={Uri.EscapeDataString(Path.GetFileName(key))}";
}
