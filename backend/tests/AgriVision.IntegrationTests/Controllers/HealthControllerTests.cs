using System.Net;
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
    public async Task GetHealth_ShouldReturn200OK_WithHealthDetails()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
    }
}
