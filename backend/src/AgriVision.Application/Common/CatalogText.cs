using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace AgriVision.Application.Common;

public static class CatalogText
{
    public static string? Name(string? value)
    {
        var text = Normalize(value);
        // The Alpine runtime uses invariant globalization; do not instantiate a named culture.
        return string.IsNullOrEmpty(text) ? text : char.ToUpperInvariant(text[0]) + text[1..];
    }

    public static string? Normalize(string? value) => value is null ? null : string.Join('\n',
        value.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n')
            .Select(line => Regex.Replace(line, "[\\t\\u00a0 ]+", " ").Trim())).Trim();

    private static string SearchText(string value)
    {
        var letters = value.Normalize(NormalizationForm.FormD).Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray();
        return Regex.Replace(new string(letters).ToLowerInvariant().Replace('đ', 'd').Replace('_', ' '), "\\s+", " ").Trim();
    }

    public static int MatchScore(string value, string query)
    {
        var text = SearchText(value);
        var term = SearchText(query);
        if (term.Length == 0 || text == term) return 0;
        if (text.Contains(term, StringComparison.Ordinal)) return 1;
        var words = text.Split(' ');
        return term.Split(' ').All(part => words.Any(word => word.Contains(part, StringComparison.Ordinal) ||
            (part.Length >= 3 && Math.Abs(word.Length - part.Length) <= 2 && Distance(word, part) <= (part.Length >= 6 ? 2 : 1)))) ? 2 : -1;
    }

    private static int Distance(string left, string right)
    {
        var previous = Enumerable.Range(0, right.Length + 1).ToArray();
        for (var i = 0; i < left.Length; i++)
        {
            var next = new int[right.Length + 1];
            next[0] = i + 1;
            for (var j = 0; j < right.Length; j++)
                next[j + 1] = Math.Min(Math.Min(next[j] + 1, previous[j + 1] + 1), previous[j] + (left[i] == right[j] ? 0 : 1));
            previous = next;
        }
        return previous[right.Length];
    }
}
