using System.Reflection;
using System.Text.Json;

namespace AgriVision.ApiTests.Contracts;

internal static class ApiManifest
{
    internal record Entry(string Method, string Route, string[] Cases);
    internal record Case(string Id, MethodInfo Method);
    internal static Entry[] Load()
    {
        using var stream = typeof(ApiManifest).Assembly.GetManifestResourceStream("AgriVision.ApiTests.Contracts.api_manifest.json")!;
        return JsonSerializer.Deserialize<Entry[]>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }
    internal static Case[] Discover() => typeof(ApiManifest).Assembly.GetTypes().SelectMany(type => type.GetMethods())
        .SelectMany(method => method.GetCustomAttributesData()
            .Where(attribute => attribute.AttributeType == typeof(TraitAttribute) && (string?)attribute.ConstructorArguments[0].Value == "ApiCase")
            .Select(attribute => new Case((string)attribute.ConstructorArguments[1].Value!, method))).ToArray();

    internal static string[] Errors(Entry[] entries, Case[] cases)
    {
        var errors = new List<string>();
        foreach (var duplicate in cases.GroupBy(item => item.Id).Where(group => group.Count() > 1))
            errors.Add("Duplicate case: " + duplicate.Key);
        foreach (var item in cases.Where(item => !item.Method.GetCustomAttributes<FactAttribute>().Any()))
            errors.Add("Not an xUnit test: " + item.Method.DeclaringType!.Name + "." + item.Method.Name);
        var expected = entries.SelectMany(entry => entry.Cases).ToHashSet();
        var actual = cases.Select(item => item.Id).ToHashSet();
        errors.AddRange(expected.Except(actual).Select(id => "Missing test: " + id));
        errors.AddRange(actual.Except(expected).Select(id => "Unmapped test: " + id));
        errors.AddRange(entries.Where(entry => entry.Cases.Length == 0).Select(entry => "Empty cases: " + entry.Method + " " + entry.Route));
        return errors.ToArray();
    }
    internal static string Normalize(string route) => "/" + route.Trim('/').ToLowerInvariant();
}
