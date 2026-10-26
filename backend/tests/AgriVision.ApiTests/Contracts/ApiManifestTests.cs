using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Contracts;

public class ApiManifestTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Fact]
    public void Manifest_MatchesAllRuntimeControllerRoutes()
    {
        using var client = factory.CreateClient();
        var entries = ApiManifest.Load();
        var actual = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() != null)
            .SelectMany(endpoint => endpoint.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods
                .Select(method => method.ToUpperInvariant() + " " + ApiManifest.Normalize(endpoint.RoutePattern.RawText!)))
            .ToHashSet();
        entries.Select(entry => entry.Method + " " + ApiManifest.Normalize(entry.Route)).Should().OnlyHaveUniqueItems();
        entries.Select(entry => entry.Method + " " + ApiManifest.Normalize(entry.Route)).Should().BeEquivalentTo(actual);
    }
}

public class ApiManifestMappingTests
{
    [Fact]
    public void Manifest_ReferencesOnlyDiscoverableUniqueApiCases() => ApiManifest.Errors(ApiManifest.Load(), ApiManifest.Discover()).Should().BeEmpty();

    [Theory]
    [InlineData("missing", "Missing test: absent")]
    [InlineData("duplicate", "Duplicate case: case")]
    [InlineData("orphan", "Unmapped test: case")]
    [InlineData("not-test", "Not an xUnit test: ApiManifestMappingTests.Helper")]
    public void Guard_RejectsBrokenCaseMappings(string scenario, string error)
    {
        var method = typeof(ApiManifestMappingTests).GetMethod(nameof(Manifest_ReferencesOnlyDiscoverableUniqueApiCases))!;
        var entries = new[] { new ApiManifest.Entry("GET", "/api/sample", [scenario == "missing" ? "absent" : "case"]) };
        var cases = new[] { new ApiManifest.Case("case", method) };
        if (scenario == "duplicate") cases = [cases[0], cases[0]];
        if (scenario == "orphan") entries = [];
        if (scenario == "not-test") cases = [new("case", typeof(ApiManifestMappingTests).GetMethod(nameof(Helper), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!)];
        ApiManifest.Errors(entries, cases).Should().Contain(error);
    }

    private static void Helper() { }
}
