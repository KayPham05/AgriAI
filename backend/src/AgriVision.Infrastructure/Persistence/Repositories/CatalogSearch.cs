using AgriVision.Application.Common;
using AgriVision.Application.DTOs.Knowledge;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

internal record CatalogSearchEntry(Guid Id, string Text, string? Alternative);

internal static class CatalogSearch
{
    // Read only identifiers and short names; load content/navigation data for the requested page only.
    public static async Task<(Guid[] Ids, int Total)> PageAsync(IQueryable<CatalogSearchEntry> names,
        CatalogFilterParams filter, CancellationToken cancellationToken)
    {
        var entries = await names.ToListAsync(cancellationToken);
        var ranked = entries.Select(entry => new { entry.Id, entry.Text, Score = Score(entry, filter.Search!) })
            .Where(entry => entry.Score >= 0).OrderBy(entry => entry.Score).ThenBy(entry => entry.Text, StringComparer.Ordinal).ThenBy(entry => entry.Id).ToArray();
        return (ranked.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).Select(entry => entry.Id).ToArray(), ranked.Length);
    }

    private static int Score(CatalogSearchEntry entry, string query)
    {
        var primary = CatalogText.MatchScore(entry.Text, query);
        var alternative = entry.Alternative is null ? -1 : CatalogText.MatchScore(entry.Alternative, query);
        return primary < 0 ? alternative : alternative < 0 ? primary : Math.Min(primary, alternative);
    }
}
