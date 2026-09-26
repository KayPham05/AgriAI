using System.Net;
using System.Net.Http.Json;
using AgriVision.Application.DTOs.Auth;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Xunit;

namespace AgriVision.IntegrationTests.Controllers;

public class AuthControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(AgriVisionFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RegisterAndLogin_ShouldSucceed_WhenValidDataProvided()
    {
        // Arrange
        var email = $"integration_{Guid.NewGuid()}@example.com";
        var registerRequest = new RegisterRequest("Integration User", email, "Password123!");

        // Act - Register
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Assert - Register
        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        registerResult.Should().NotBeNull();
        registerResult!.Token.Should().NotBeNullOrEmpty();
        registerResult.User.Email.Should().Be(email);

        // Act - Login
        var loginRequest = new LoginRequest(email, "Password123!");
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert - Login
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        loginResult.Should().NotBeNull();
        loginResult!.Token.Should().NotBeNullOrEmpty();
        loginResult.User.Email.Should().Be(email);
    }
}
