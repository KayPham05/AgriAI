using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Nodes;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Plant;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace AgriVision.IntegrationTests.Controllers;

[Trait("Category", "Security")]
public class SecurityAuthorizationTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("missing")]
    [InlineData("malformed")]
    [InlineData("expired")]
    [InlineData("future")]
    [InlineData("wrong-key")]
    [InlineData("wrong-issuer")]
    [InlineData("wrong-audience")]
    [InlineData("unsigned")]
    [InlineData("tampered-role")]
    [InlineData("missing-sid")]
    [InlineData("nonexistent-sid")]
    public async Task ProtectedEndpoints_ShouldRejectInvalidBearer(string variant)
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(auth.Token);
        var sidClaim = jwt.Claims.FirstOrDefault(c => c.Type == "sid")?.Value;
        Guid? validSessionId = Guid.TryParse(sidClaim, out var parsedSid) ? parsedSid : null;

        var token = CreateToken(auth.User.Id, variant, validSessionId);
        client.DefaultRequestHeaders.Authorization = variant == "missing"
            ? null : new AuthenticationHeaderValue("Bearer", token);

        var routes = new[] { "/api/auth/me", "/api/predictions", $"/api/predictions/{Guid.NewGuid()}" };
        foreach (var route in routes)
        {
            using var response = await client.GetAsync(route);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized, $"{variant}: {route}");
        }
        using var deletion = await client.DeleteAsync($"/api/predictions/{Guid.NewGuid()}");
        deletion.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var write = await client.PostAsJsonAsync("/api/plants", new { name = "Forbidden" });
        write.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("plants", "POST", false)]
    [InlineData("plants", "PUT", false)]
    [InlineData("plants", "DELETE", false)]
    [InlineData("diseases", "POST", false)]
    [InlineData("diseases", "PUT", false)]
    [InlineData("diseases", "DELETE", false)]
    [InlineData("plants", "POST", true)]
    [InlineData("plants", "PUT", true)]
    [InlineData("plants", "DELETE", true)]
    [InlineData("diseases", "POST", true)]
    [InlineData("diseases", "PUT", true)]
    [InlineData("diseases", "DELETE", true)]
    public async Task CatalogWrites_ShouldRejectGuestAndRegularUser(string resource, string method, bool signedIn)
    {
        using var client = factory.CreateClient();
        if (signedIn)
        {
            var auth = await RegisterAsync(client);
            client.DefaultRequestHeaders.Authorization = new("Bearer", auth.Token);
        }
        var id = Guid.NewGuid();
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = resource == "plants" ? await database.Plants.CountAsync() : await database.Diseases.CountAsync();
        using var request = new HttpRequestMessage(new HttpMethod(method),
            $"/api/{resource}" + (method == "POST" ? "" : $"/{id}"))
        {
            Content = method == "DELETE" ? null : JsonContent.Create(new { name = $"Forbidden_{id:N}", isActive = false })
        };

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(signedIn ? HttpStatusCode.Forbidden : HttpStatusCode.Unauthorized);
        var after = resource == "plants" ? await database.Plants.CountAsync() : await database.Diseases.CountAsync();
        after.Should().Be(before);
    }

    [Fact]
    public async Task AdminCatalogWrite_ShouldWork_WithTokenIssuedAfterRoleAssignment()
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await database.Users.Where(user => user.Id == auth.User.Id)
            .ExecuteUpdateAsync(update => update.SetProperty(user => user.Role, "Admin"));
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "Password123!"));
        login.EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Authorization = new("Bearer", (await login.Content.ReadFromJsonAsync<AuthResponse>())!.Token);

        using var created = await client.PostAsJsonAsync("/api/plants", new { name = $"Admin_fixture_{Guid.NewGuid():N}" });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var plant = (await created.Content.ReadFromJsonAsync<PlantDto>())!;
        (await database.Plants.AnyAsync(item => item.Id == plant.Id)).Should().BeTrue();
        using var deleted = await client.DeleteAsync($"/api/plants/{plant.Id}");
        deleted.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Registration_ShouldIgnoreInjectedRole_AndNeverExposePasswordHash()
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Role injection", email = $"role_{Guid.NewGuid():N}@example.test", password = "Password123!",
            role = "Admin", isActive = false
        });
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        auth.User.Role.Should().Be("User");
        client.DefaultRequestHeaders.Authorization = new("Bearer", auth.Token);
        using var me = await client.GetAsync("/api/auth/me");
        me.EnsureSuccessStatusCode();
        (await me.Content.ReadFromJsonAsync<UserDto>())!.Id.Should().Be(auth.User.Id);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("Password123!").And.NotContain("passwordHash");
        (await me.Content.ReadAsStringAsync()).Should().NotContain("passwordHash");
        await using var scope = factory.Services.CreateAsyncScope();
        var user = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.SingleAsync(item => item.Id == auth.User.Id);
        user.Role.Should().Be("User");
        user.IsActive.Should().BeTrue();
        user.PasswordHash.Should().NotBe("Password123!");
        BCrypt.Net.BCrypt.Verify("Password123!", user.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task History_ShouldIsolateAccounts_AndRejectForeignOrGuestDeletion()
    {
        using var owner = factory.CreateClient();
        using var other = factory.CreateClient();
        using var guest = factory.CreateClient();
        var ownerAuth = await RegisterAsync(owner);
        var otherAuth = await RegisterAsync(other);
        owner.DefaultRequestHeaders.Authorization = new("Bearer", ownerAuth.Token);
        other.DefaultRequestHeaders.Authorization = new("Bearer", otherAuth.Token);
        using var image = new MultipartFormDataContent();
        var bytes = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x01]);
        bytes.Headers.ContentType = new("image/jpeg");
        image.Add(bytes, "file", "security-fixture.jpg");
        using var created = await owner.PostAsync("/api/predictions", image);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = (await created.Content.ReadFromJsonAsync<PredictionResultDto>())!;

        using var foreignRead = await other.GetAsync($"/api/predictions/{result.Id}");
        foreignRead.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await foreignRead.Content.ReadAsStringAsync()).Should().NotContain(result.ImagePath);
        using var foreignDelete = await other.DeleteAsync($"/api/predictions/{result.Id}");
        foreignDelete.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var guestDelete = await guest.DeleteAsync($"/api/predictions/{result.Id}");
        guestDelete.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var foreignHistory = await other.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions");
        foreignHistory!.Items.Should().BeEmpty();
        foreignHistory.TotalCount.Should().Be(0);
        var ownHistory = await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions");
        ownHistory!.Items.Should().ContainSingle(item => item.Id == result.Id);
        var stored = await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{result.Id}");
        stored!.ImagePath.Should().Be(result.ImagePath);
        stored.PredictionDetails.Should().NotBeEmpty();
        using var ownDelete = await owner.DeleteAsync($"/api/predictions/{result.Id}");
        ownDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Login_ShouldRejectWrongPasswordAndUnknownAccount_WithSamePublicError(bool existingAccount)
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        using var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            existingAccount ? auth.User.Email : $"unknown_{Guid.NewGuid():N}@example.test", "WrongPassword123!"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadFromJsonAsync<JsonObject>();
        body!["message"]!.GetValue<string>().Should().Be("Invalid email or password.");
        body.ContainsKey("token").Should().BeFalse();
    }

    private static async Task<AuthResponse> RegisterAsync(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Security fixture", $"security_{Guid.NewGuid():N}@example.test", "Password123!"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    [Fact]
    public async Task LegacyTokenWithoutSid_ShouldBeRejected_EvenWhenNewActiveSessionExists()
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);

        // User logs in again, generating a second active session
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "Password123!"));
        login.EnsureSuccessStatusCode();

        // Create an old/legacy token for this user without any 'sid' claim
        var legacyToken = CreateToken(auth.User.Id, "missing-sid");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", legacyToken);
        using var response = await client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SessionRevocation_AfterLogout_ShouldRejectSubsequentRequestsWithSameToken()
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        // Before logout: authorized
        using var beforeLogout = await client.GetAsync("/api/auth/me");
        beforeLogout.StatusCode.Should().Be(HttpStatusCode.OK);

        // Perform logout
        using var logoutResponse = await client.PostAsync("/api/auth/logout", null);
        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // After logout: token's session is revoked, subsequent calls must return 401
        using var afterLogout = await client.GetAsync("/api/auth/me");
        afterLogout.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SessionRevocation_AfterUserDeactivation_ShouldRejectSubsequentRequests()
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        using var beforeDeactivation = await client.GetAsync("/api/auth/me");
        beforeDeactivation.StatusCode.Should().Be(HttpStatusCode.OK);

        // Deactivate user in database
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Users.Where(u => u.Id == auth.User.Id)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.IsActive, false));

        // Subsequent request must be rejected with 401
        using var afterDeactivation = await client.GetAsync("/api/auth/me");
        afterDeactivation.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SessionRevocation_AfterRoleChange_ShouldRejectSubsequentRequests()
    {
        using var client = factory.CreateClient();
        var auth = await RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        using var beforeChange = await client.GetAsync("/api/auth/me");
        beforeChange.StatusCode.Should().Be(HttpStatusCode.OK);

        // Change role in database (e.g. role change)
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Users.Where(u => u.Id == auth.User.Id)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.Role, "Admin"));

        // Subsequent request with old token (which has role=User) must be rejected with 401
        using var afterChange = await client.GetAsync("/api/auth/me");
        afterChange.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private string CreateToken(Guid userId, string variant, Guid? sessionId = null)
    {
        if (variant == "malformed") return "invalid.jwt.payload";
        var configuration = factory.Services.GetRequiredService<IConfiguration>();
        var secret = variant == "wrong-key" ? new string('z', 32) : configuration["JwtSettings:Secret"]!;
        var credentials = variant == "unsigned" ? null : new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.Role, "User")
        };

        if (variant == "nonexistent-sid")
        {
            claims.Add(new Claim("sid", Guid.NewGuid().ToString()));
        }
        else if (variant != "missing-sid" && sessionId.HasValue)
        {
            claims.Add(new Claim("sid", sessionId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: variant == "wrong-issuer" ? "UntrustedIssuer" : configuration["JwtSettings:Issuer"] ?? "AgriVisionAPI",
            audience: variant == "wrong-audience" ? "UntrustedAudience" : configuration["JwtSettings:Audience"] ?? "AgriVisionApp",
            claims: claims,
            notBefore: variant == "future" ? now.AddHours(1) : now.AddHours(-2),
            expires: variant == "expired" ? now.AddHours(-1) : now.AddHours(2),
            signingCredentials: credentials);
        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        if (variant != "tampered-role") return encoded;
        var parts = encoded.Split('.');
        var payload = JsonNode.Parse(Base64UrlEncoder.Decode(parts[1]))!.AsObject();
        payload[ClaimTypes.Role] = "Admin";
        return $"{parts[0]}.{Base64UrlEncoder.Encode(payload.ToJsonString())}.{parts[2]}";
    }
}
