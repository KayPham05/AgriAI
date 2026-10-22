using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.IntegrationTests.Controllers;

public class AgriculturalProfilesControllerTests : IClassFixture<AgriVisionFactory>
{
    private const string ProfilesUrl = "/api/agricultural-profiles";
    private readonly AgriVisionFactory _factory;

    public AgriculturalProfilesControllerTests(AgriVisionFactory factory) => _factory = factory;

    [Fact]
    public async Task Owner_CanCreateListReadUpdateAndDeleteProfile()
    {
        using var owner = _factory.CreateClient();
        var userId = await RegisterAsync(owner);
        var response = await owner.PostAsJsonAsync(ProfilesUrl,
            new { name = "  Vườn nhà  ", description = "  Ghi chú canh tác  ", userId = Guid.NewGuid() });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();
        response.Headers.Location!.ToString().Should().EndWith($"{ProfilesUrl}/{id}");
        created.GetProperty("userId").GetGuid().Should().Be(userId);
        created.GetProperty("name").GetString().Should().Be("Vườn nhà");
        created.GetProperty("description").GetString().Should().Be("Ghi chú canh tác");
        created.GetProperty("predictionCount").GetInt32().Should().Be(0);

        var list = await owner.GetFromJsonAsync<JsonElement[]>(ProfilesUrl);
        list.Should().ContainSingle();
        list![0].GetProperty("id").GetGuid().Should().Be(id);
        var detail = await owner.GetFromJsonAsync<JsonElement>($"{ProfilesUrl}/{id}");
        detail.GetProperty("name").GetString().Should().Be("Vườn nhà");

        var updated = await owner.PutAsJsonAsync($"{ProfilesUrl}/{id}",
            new { name = " Vườn mới ", description = (string?)null, userId = Guid.NewGuid() });
        updated.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await updated.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("name").GetString().Should().Be("Vườn mới");
        result.GetProperty("description").ValueKind.Should().Be(JsonValueKind.Null);
        result.GetProperty("userId").GetGuid().Should().Be(userId);
        result.GetProperty("updatedAt").GetDateTime().Should().BeOnOrAfter(created.GetProperty("createdAt").GetDateTime());

        (await owner.DeleteAsync($"{ProfilesUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetAsync($"{ProfilesUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.GetFromJsonAsync<JsonElement[]>(ProfilesUrl)).Should().BeEmpty();
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Guest_CannotManageProfiles(string method)
    {
        using var guest = _factory.CreateClient();
        var url = method is "PUT" or "DELETE" ? $"{ProfilesUrl}/{Guid.NewGuid()}" : ProfilesUrl;
        using var request = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT") request.Content = JsonContent.Create(new { name = "Vườn" });
        (await guest.SendAsync(request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OtherUserOrAdmin_CannotReadChangeOrDeleteProfile(bool isAdmin)
    {
        using var owner = _factory.CreateClient();
        using var other = _factory.CreateClient();
        await RegisterAsync(owner);
        var otherId = await RegisterAsync(other);
        if (isAdmin)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(user => user.Id == otherId);
            user.Role = "Admin";
            await db.SaveChangesAsync();
            // Reissue a token with the role to exercise an actual Admin principal.
            var login = await other.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(user.Email, "Password123!"));
            login.EnsureSuccessStatusCode();
            var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;
            other.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        }
        var id = await CreateProfileAsync(owner);
        (await other.GetFromJsonAsync<JsonElement[]>(ProfilesUrl)).Should().BeEmpty();
        (await other.GetAsync($"{ProfilesUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await other.PutAsJsonAsync($"{ProfilesUrl}/{id}", new { name = "Stolen" }))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await other.DeleteAsync($"{ProfilesUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var original = await owner.GetFromJsonAsync<JsonElement>($"{ProfilesUrl}/{id}");
        original.GetProperty("name").GetString().Should().Be("Vườn nhà");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t\r\n")]
    public async Task CreateAndUpdate_RejectEmptyNames(string? name)
    {
        using var owner = _factory.CreateClient();
        await RegisterAsync(owner);
        var id = await CreateProfileAsync(owner);
        (await owner.PostAsJsonAsync(ProfilesUrl, new { name })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await owner.PutAsJsonAsync($"{ProfilesUrl}/{id}", new { name })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await owner.GetFromJsonAsync<JsonElement[]>(ProfilesUrl)).Should().ContainSingle();
    }

    [Fact]
    public async Task NameBoundary_Allows150CharactersAndRejects151()
    {
        using var owner = _factory.CreateClient();
        await RegisterAsync(owner);
        var response = await owner.PostAsJsonAsync(ProfilesUrl, new { name = new string('a', 150) });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = profile.GetProperty("id").GetGuid();
        (await owner.PostAsJsonAsync(ProfilesUrl, new { name = new string('a', 151) }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await owner.PutAsJsonAsync($"{ProfilesUrl}/{id}", new { name = new string('a', 151) }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Diagnosis_CanSelectOwnedProfile_AndDeletionPreservesHistorySnapshotAndImages()
    {
        using var owner = _factory.CreateClient();
        var userId = await RegisterAsync(owner);
        var profileId = await CreateProfileAsync(owner);
        using var request = CreatePredictionRequest(profileId);
        var response = await owner.PostAsync("/api/predictions", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var prediction = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Predictions.AsNoTracking().SingleAsync(item => item.Id == prediction.Id);
        saved.UserId.Should().Be(userId);
        saved.AgriculturalProfileId.Should().Be(profileId);
        var snapshot = saved.ResultSnapshotJson;
        var image = await db.PredictionImages.AsNoTracking().SingleAsync(item => item.PredictionId == prediction.Id);
        image.ExpiresAt.Should().Be(saved.CreatedAt.AddDays(30));
        var detail = await owner.GetFromJsonAsync<JsonElement>($"{ProfilesUrl}/{profileId}");
        detail.GetProperty("predictionCount").GetInt32().Should().Be(1);
        var list = await owner.GetFromJsonAsync<JsonElement[]>(ProfilesUrl);
        list![0].GetProperty("predictionCount").GetInt32().Should().Be(1);
        var filtered = await owner.GetFromJsonAsync<JsonElement>($"/api/predictions?agriculturalProfileId={profileId}");
        filtered.GetProperty("totalCount").GetInt32().Should().Be(1);
        filtered.GetProperty("items")[0].GetProperty("id").GetGuid().Should().Be(prediction.Id);

        (await owner.DeleteAsync($"{ProfilesUrl}/{profileId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var retained = await db.Predictions.AsNoTracking().SingleAsync(item => item.Id == prediction.Id);
        retained.AgriculturalProfileId.Should().BeNull();
        retained.ResultSnapshotJson.Should().Be(snapshot);
        (await db.PredictionImages.AsNoTracking().SingleAsync(item => item.Id == image.Id)).Should().BeEquivalentTo(image);
        (await db.PredictionDetails.CountAsync(item => item.PredictionId == prediction.Id)).Should().Be(2);
        (await owner.GetAsync($"/api/predictions/{prediction.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        var history = await owner.GetFromJsonAsync<JsonElement>("/api/predictions");
        history.GetProperty("totalCount").GetInt32().Should().Be(1);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Diagnosis_RejectsForeignOrMissingProfile_WithoutPersisting(bool foreign)
    {
        using var owner = _factory.CreateClient();
        using var other = _factory.CreateClient();
        await RegisterAsync(owner);
        var userId = await RegisterAsync(other);
        var id = foreign ? await CreateProfileAsync(owner) : Guid.NewGuid();
        using var request = CreatePredictionRequest(id);
        (await other.PostAsync("/api/predictions", request)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Predictions.CountAsync(item => item.UserId == userId)).Should().Be(0);
    }

    [Fact]
    public async Task Guest_CannotSelectProfileForDiagnosis()
    {
        using var guest = _factory.CreateClient();
        using var request = CreatePredictionRequest(Guid.NewGuid());
        (await guest.PostAsync("/api/predictions", request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<Guid> RegisterAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Profile Test", $"profiles_{Guid.NewGuid():N}@example.test", "Password123!"));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth.User.Id;
    }

    private static async Task<Guid> CreateProfileAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync(ProfilesUrl, new { name = "Vườn nhà" });
        response.EnsureSuccessStatusCode();
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>();
        return profile.GetProperty("id").GetGuid();
    }

    private static MultipartFormDataContent CreatePredictionRequest(Guid profileId)
    {
        var request = new MultipartFormDataContent();
        request.Add(new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x01]), "file", "leaf.jpg");
        request.Add(new StringContent(profileId.ToString()), "agriculturalProfileId");
        return request;
    }
}
