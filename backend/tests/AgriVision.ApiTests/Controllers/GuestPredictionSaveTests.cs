using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public partial class GuestPredictionsControllerTests
{
    [Fact]
    [Trait("ApiCase", "predictions.guest.save_roundtrip")]
    public async Task GuestSave_RequiresLogin_PersistsOriginalSnapshot_AndIsIdempotent()
    {
        var predictor = new RecordingPredictor();
        using var application = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(predictor);
        }));
        using var client = application.CreateClient();
        using var upload = CreateImageRequest();
        using var predictionResponse = await client.PostAsync("/api/predictions", upload);
        predictionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var guest = (await predictionResponse.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        guest.GuestToken.Should().HaveLength(64);
        guest.GuestExpiresAt.Should().BeAfter(DateTime.UtcNow);
        var request = new SaveGuestPredictionRequest(guest.GuestToken!);
        using var unauthorized = await client.PostAsJsonAsync("/api/predictions/guest/save", request);
        unauthorized.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using (var preview = await client.SendAsync(GuestImageRequest(guest.GuestToken!)))
        {
            preview.StatusCode.Should().Be(HttpStatusCode.OK);
            preview.Headers.CacheControl!.NoStore.Should().BeTrue();
            preview.Content.Headers.ContentType!.MediaType.Should().Be("image/jpeg");
            (await preview.Content.ReadAsByteArrayAsync()).Should().Equal(0xFF, 0xD8, 0xFF, 0xE0, 0x01);
        }
        using var registration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Guest save owner", $"guest_save_{Guid.NewGuid():N}@example.com", "Password123!"));
        registration.EnsureSuccessStatusCode();
        var session = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        using var savedResponse = await client.PostAsJsonAsync("/api/predictions/guest/save", request);
        savedResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var saved = (await savedResponse.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        saved.Id.Should().Be(guest.Id);
        saved.CreatedAt.Should().Be(guest.CreatedAt);
        saved.PredictedPlantDisease.Should().BeEquivalentTo(guest.PredictedPlantDisease);
        saved.PredictionDetails.Should().BeEquivalentTo(guest.PredictionDetails);
        saved.GuestToken.Should().BeNull();
        saved.HasHistoricalSnapshot.Should().BeTrue();
        saved.Images.Should().ContainSingle();
        using var retry = await client.PostAsJsonAsync("/api/predictions/guest/save", request);
        retry.StatusCode.Should().Be(HttpStatusCode.Created);
        (await retry.Content.ReadFromJsonAsync<PredictionResultDto>())!.Id.Should().Be(guest.Id);
        using var history = await client.GetAsync(savedResponse.Headers.Location);
        history.StatusCode.Should().Be(HttpStatusCode.OK);
        using var image = await client.GetAsync(saved.Images.Single().ImagePath);
        image.StatusCode.Should().Be(HttpStatusCode.OK);
        using var oldPreview = await client.SendAsync(GuestImageRequest(guest.GuestToken!));
        oldPreview.StatusCode.Should().Be(HttpStatusCode.NotFound);
        predictor.Calls.Should().Be(1);
        await using var scope = application.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Predictions.CountAsync(p => p.Id == guest.Id && p.UserId == session.User.Id)).Should().Be(1);
        (await db.PredictionImages.CountAsync(i => i.PredictionId == guest.Id)).Should().Be(1);
        using var otherRegistration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Other owner", $"other_{Guid.NewGuid():N}@example.com", "Password123!"));
        otherRegistration.EnsureSuccessStatusCode();
        var other = (await otherRegistration.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", other.Token);
        using var stolen = await client.PostAsJsonAsync("/api/predictions/guest/save", request);
        stolen.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("", HttpStatusCode.BadRequest)]
    [InlineData("short", HttpStatusCode.BadRequest)]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", HttpStatusCode.NotFound)]
    [Trait("ApiCase", "predictions.guest.save_invalid_token")]
    public async Task GuestSave_RejectsMalformedOrMissingTokens(string token, HttpStatusCode expected)
    {
        using var client = _factory.CreateClient();
        using var registration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Token validation", $"token_{Guid.NewGuid():N}@example.com", "Password123!"));
        registration.EnsureSuccessStatusCode();
        var session = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        var before = await ReadStoredIdsAsync();
        using var response = await client.PostAsJsonAsync("/api/predictions/guest/save", new SaveGuestPredictionRequest(token));
        response.StatusCode.Should().Be(expected);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    [Fact]
    [Trait("ApiCase", "predictions.guest.preview_missing")]
    public async Task GuestPreview_RejectsUnknownTokenWithoutAccessingStorage()
    {
        var storage = new RejectingStorage();
        using var app = CreateGuestApplication(new RecordingPredictor(), storage);
        using var client = app.CreateClient();
        using var response = await client.SendAsync(GuestImageRequest(new string('A', 64)));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        storage.Calls.Should().Be(0);
    }

    private static HttpRequestMessage GuestImageRequest(string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/predictions/guest/image");
        request.Headers.Add("X-Guest-Prediction", token);
        return request;
    }
}
