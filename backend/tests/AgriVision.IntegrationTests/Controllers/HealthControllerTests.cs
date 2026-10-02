using System.Net;
using System.Text.Json;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Xunit;

namespace AgriVision.IntegrationTests.Controllers;

public class HealthControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly HttpClient _client;

    public HealthControllerTests(AgriVisionFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ShouldReportDatabaseReady_WithoutAiService()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var content = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var checks = content.RootElement.GetProperty("checks");
        checks.GetProperty("database").GetString().Should().Be("Healthy");
        checks.TryGetProperty("aiService", out _).Should().BeFalse();
        content.RootElement.GetProperty("status").GetString().Should().Be("Healthy");
    }

    [Fact]
    public async Task GetDependencies_ShouldReportUnavailableAi()
    {
        var response = await _client.GetAsync("/api/health/deps");

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        using var content = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        content.RootElement.GetProperty("checks").GetProperty("aiService").GetString().Should().Be("Unreachable");
        content.RootElement.GetProperty("status").GetString().Should().Be("Degraded");
    }
}
