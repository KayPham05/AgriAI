using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.DTOs.Auth;
using AgriVision.TestSupport;
using FluentAssertions;

namespace AgriVision.ApiTests.Controllers;

public class UserAuthContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("logout")]
    [InlineData("password")]
    [Trait("ApiCase", "auth.revocation_ahead_clock")]
    public async Task Revocation_StillWorksForSessionCreatedOnAnAheadHost(string operation)
    {
        using var client = factory.CreateClient();
        var account = await ApiTestClient.Register(client);
        Guid sessionId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AgriVision.Infrastructure.Persistence.AppDbContext>();
            var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.Users, x => x.Id == account.User.Id);
            var created = DateTime.UtcNow.AddMinutes(5);
            var session = new AgriVision.Domain.Entities.UserSession { UserId = user.Id, CreatedAt = created, ExpiresAt = created.AddDays(1) };
            db.UserSessions.Add(session);
            await db.SaveChangesAsync();
            sessionId = session.Id;
            var generator = scope.ServiceProvider.GetRequiredService<AgriVision.Application.Common.Interfaces.Authentication.IJwtTokenGenerator>();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", generator.GenerateToken(user, session.Id));
        }
        using var before = await client.GetAsync("/api/auth/me");
        before.StatusCode.Should().Be(HttpStatusCode.OK);
        using var response = operation == "logout"
            ? await client.PostAsync("/api/auth/logout", null)
            : await client.PostAsJsonAsync("/api/users/change-password", new { currentPassword = ApiTestClient.Password, newPassword = "Changed123!", confirmPassword = "Changed123!" });
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var after = await client.GetAsync("/api/auth/me");
        after.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        await using var verify = factory.Services.CreateAsyncScope();
        var context = verify.ServiceProvider.GetRequiredService<AgriVision.Infrastructure.Persistence.AppDbContext>();
        var revoked = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(context.UserSessions, x => x.Id == sessionId);
        revoked.RevokedAt.Should().NotBeNull();
        revoked.RevokedAt!.Value.Should().BeOnOrAfter(revoked.CreatedAt);
    }

    [Fact]
    [Trait("ApiCase", "auth.register.contract")]
    public async Task Register_ReturnsPublicIdentityAndUsableSession()
    {
        using var client = factory.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var me = await client.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(me);
        body.GetProperty("id").GetGuid().Should().Be(auth.User.Id);
        body.GetProperty("email").GetString().Should().Be(auth.User.Email);
        body.GetProperty("role").GetString().Should().Be("User");
        body.TryGetProperty("passwordHash", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData("", "valid@example.test", "123456")]
    [InlineData("Fixture", "not-email", "123456")]
    [InlineData("Fixture", "valid@example.test", "12345")]
    [Trait("ApiCase", "auth.register.validation")]
    public async Task Register_InvalidFields_ReturnsValidationErrors(string name, string email, string password)
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/auth/register", new { fullName = name, email, password });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("errors");
    }

    [Theory]
    [InlineData(100, HttpStatusCode.OK)]
    [InlineData(101, HttpStatusCode.BadRequest)]
    [Trait("ApiCase", "auth.register.name_boundary")]
    public async Task Register_NameBoundary_EnforcesContract(int length, HttpStatusCode expected)
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(new string('a', length), $"boundary_{Guid.NewGuid():N}@example.test", "123456"));
        response.StatusCode.Should().Be(expected);
    }

    [Fact]
    [Trait("ApiCase", "auth.register.duplicate")]
    public async Task Register_DuplicateEmail_RejectsAndPreservesOriginalLogin()
    {
        using var client = factory.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var duplicate = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Duplicate", auth.User.Email, "OtherPassword!"));
        duplicate.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, ApiTestClient.Password));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(login);
        body.GetProperty("user").GetProperty("id").GetGuid().Should().Be(auth.User.Id);
    }

    [Theory]
    [InlineData("/api/auth/register")]
    [InlineData("/api/auth/login")]
    [Trait("ApiCase", "auth.malformed_body")]
    public async Task Auth_MalformedJson_ReturnsBadRequest(string route)
    {
        using var client = factory.CreateClient();
        using var content = new StringContent("{", Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(route, content);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("", "Password123!")]
    [InlineData("not-email", "Password123!")]
    [InlineData("valid@example.test", "")]
    [Trait("ApiCase", "auth.login.validation")]
    public async Task Login_InvalidFields_ReturnsBadRequest(string email, string password)
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    [Trait("ApiCase", "users.profile.contract")]
    public async Task Profile_UpdateTrimsNameAndIgnoresPrivilegedProperties()
    {
        using var client = factory.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var update = await client.PutAsJsonAsync("/api/users/profile", new { fullName = "  Updated farmer  ", email = "injected@example.test", role = "Admin", isActive = false });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        using var get = await client.GetAsync("/api/users/profile");
        get.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(get);
        body.GetProperty("fullName").GetString().Should().Be("Updated farmer");
        body.GetProperty("email").GetString().Should().Be(auth.User.Email);
        body.GetProperty("role").GetString().Should().Be("User");
        body.GetProperty("isActive").GetBoolean().Should().BeTrue();
        body.GetProperty("id").GetGuid().Should().Be(auth.User.Id);
        body.TryGetProperty("passwordHash", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData(0, HttpStatusCode.BadRequest)]
    [InlineData(1, HttpStatusCode.OK)]
    [InlineData(60, HttpStatusCode.OK)]
    [InlineData(61, HttpStatusCode.BadRequest)]
    [Trait("ApiCase", "users.profile.name_boundary")]
    public async Task Profile_NameBoundary_DoesNotMutateOnFailure(int length, HttpStatusCode expected)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Register(client);
        using var response = await client.PutAsJsonAsync("/api/users/profile", new { fullName = new string('a', length) });
        response.StatusCode.Should().Be(expected);
        using var get = await client.GetAsync("/api/users/profile");
        (await ApiTestClient.Json(get)).GetProperty("fullName").GetString().Should().Be(expected == HttpStatusCode.OK ? new string('a', length) : "API fixture");
    }

    [Theory]
    [InlineData("wrong", "New123!", "New123!")]
    [InlineData("", "New123!", "New123!")]
    [InlineData("Password123!", "", "")]
    [InlineData("Password123!", "12345", "12345")]
    [InlineData("Password123!", "New123!", "different")]
    [InlineData("Password123!", "Password123!", "Password123!")]
    [Trait("ApiCase", "users.password.invalid")]
    public async Task Password_InvalidRequest_PreservesPasswordAndSession(string currentPassword, string newPassword, string confirmPassword)
    {
        using var client = factory.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var response = await client.PostAsJsonAsync("/api/users/change-password", new { currentPassword, newPassword, confirmPassword });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, ApiTestClient.Password));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    [Trait("ApiCase", "users.password.minimum")]
    public async Task Password_SixCharacters_AcceptsAndRevokesOldSession()
    {
        using var client = factory.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var change = await client.PostAsJsonAsync("/api/users/change-password", new { currentPassword = ApiTestClient.Password, newPassword = "123456", confirmPassword = "123456" });
        change.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "123456"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
