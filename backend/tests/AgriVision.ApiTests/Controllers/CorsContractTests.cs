using System.Net;
using AgriVision.TestSupport;
using Microsoft.AspNetCore.Hosting;
using FluentAssertions;

namespace AgriVision.ApiTests.Controllers;

public class CorsContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Fact]
    public async Task Cors_AllowsConfiguredOrigin_AndRejectsUnconfiguredOrigin()
    {
        using var app = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("Cors:AllowedOrigins", "https://app.example.test"));
        using var client = app.CreateClient();

        using var allowed = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        allowed.Headers.Add("Origin", "https://app.example.test");
        allowed.Headers.Add("Access-Control-Request-Method", "GET");
        using var allowedResponse = await client.SendAsync(allowed);
        allowedResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        allowedResponse.Headers.GetValues("Access-Control-Allow-Origin")
            .Should().ContainSingle("https://app.example.test");

        using var denied = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        denied.Headers.Add("Origin", "https://evil.example.test");
        denied.Headers.Add("Access-Control-Request-Method", "GET");
        using var deniedResponse = await client.SendAsync(denied);
        deniedResponse.Headers.Contains("Access-Control-Allow-Origin").Should().BeFalse();
    }
}
