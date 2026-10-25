using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Services;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Services;

// Artifact-backed acceptance is explicit; ordinary integration tests keep their AI fake.
public sealed class RealCheckpointFactAttribute : FactAttribute
{
    public RealCheckpointFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("AGRIVISION_REAL_AI_URL")))
            Skip = "Set AGRIVISION_REAL_AI_URL to an isolated local FastAPI with verified checkpoints.";
    }
}

[Trait("Category", "RealCheckpoint")]
public class RealCheckpointApiTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [RealCheckpointFact]
    public async Task RealInference_ShouldMatchFastApi_AndPersistOnlyForSignedInOwner()
    {
        var baseUrl = new Uri(Environment.GetEnvironmentVariable("AGRIVISION_REAL_AI_URL")!);
        baseUrl.IsLoopback.Should().BeTrue("this test is scoped to a local isolated inference service");
        using var application = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("AiService:BaseUrl", baseUrl.AbsoluteUri);
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPlantDiseasePredictor>();
                services.AddHttpClient<IPlantDiseasePredictor, FastApiPlantDiseasePredictor>(client =>
                    client.Timeout = TimeSpan.FromSeconds(60))
                    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler());
            });
        });
        using var owner = application.CreateClient();
        using var guest = application.CreateClient();
        using var ai = new HttpClient { BaseAddress = baseUrl, Timeout = TimeSpan.FromSeconds(60) };
        using var directRequest = ImageRequest();
        using var directResponse = await ai.PostAsync("/predict", directRequest);
        directResponse.EnsureSuccessStatusCode();
        var direct = (await directResponse.Content.ReadFromJsonAsync<JsonObject>())!;
        using var registration = await owner.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Real AI fixture", $"realai_{Guid.NewGuid():N}@example.test", "Password123!"));
        registration.EnsureSuccessStatusCode();
        var auth = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;
        owner.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        using var ownerRequest = ImageRequest();
        using var ownerResponse = await owner.PostAsync("/api/predictions", ownerRequest);
        ownerResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = (await ownerResponse.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        result.PredictedPlantDisease.ClassName.Should().Be(direct["class_name"]!.GetValue<string>());
        result.PredictedPlantDisease.ClassIndex.Should().Be(direct["class_index"]!.GetValue<int>());
        result.Confidence.Should().BeApproximately(direct["confidence"]!.GetValue<double>(), 0.000001);
        result.PredictionDetails.Select(item => item.ClassName).Should().Equal(
            direct["top_k"]!.AsArray().Select(item => item!["class_name"]!.GetValue<string>()));
        var history = await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{result.Id}");
        history!.PredictedPlantDisease.ClassName.Should().Be(result.PredictedPlantDisease.ClassName);
        history.HasHistoricalSnapshot.Should().BeTrue();

        await using var scope = application.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await database.Predictions.SingleAsync(item => item.Id == result.Id);
        saved.UserId.Should().Be(auth.User.Id);
        saved.AgriculturalProfileId.Should().BeNull();
        saved.ResultSnapshotJson.Should().NotBeNullOrWhiteSpace();
        var before = await database.Predictions.CountAsync();
        var imagesBefore = await database.PredictionImages.CountAsync();
        using var guestRequest = ImageRequest();
        using var guestResponse = await guest.PostAsync("/api/predictions", guestRequest);
        guestResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var guestResult = (await guestResponse.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        guestResult.PredictedPlantDisease.ClassName.Should().Be(result.PredictedPlantDisease.ClassName);
        guestResult.Images.Should().BeEmpty();
        (await database.Predictions.CountAsync()).Should().Be(before);
        (await database.PredictionImages.CountAsync()).Should().Be(imagesBefore);
        using var guestHistory = await guest.GetAsync($"/api/predictions/{result.Id}");
        guestHistory.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static MultipartFormDataContent ImageRequest()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root != null && !File.Exists(Path.Combine(root.FullName, "backend", "AgriVision.sln")))
            root = root.Parent;
        var imagePath = Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found"),
            "frontend", "src", "assets", "banner-leaves", "rice-leaf-cutout.png");
        var bytes = new ByteArrayContent(File.ReadAllBytes(imagePath));
        bytes.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        var content = new MultipartFormDataContent();
        content.Add(bytes, "file", "rice-leaf-cutout.png");
        return content;
    }
}
