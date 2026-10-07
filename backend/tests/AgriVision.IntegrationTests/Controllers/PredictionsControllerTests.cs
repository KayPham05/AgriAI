using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Infrastructure.Services;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Infrastructure.Persistence;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.IntegrationTests.Controllers;

public class PredictionsControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly AgriVisionFactory _factory;
    private readonly HttpClient _client;

    public PredictionsControllerTests(AgriVisionFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreatePrediction_ShouldReturnCreatedAndPersistPrediction_WhenImageIsValid()
    {
        // Arrange
        await LoginAsync(_client);
        using var request = CreateImageRequest("leaf.jpg", "image/jpeg");

        // Act
        var response = await _client.PostAsync("/api/predictions", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var result = await response.Content.ReadFromJsonAsync<PredictionResultDto>();
        result.Should().NotBeNull();
        result!.ImagePath.Should().Be("https://images.test/leaf.jpg");
        result.Confidence.Should().BeApproximately(0.94, 0.0001);
        result.PredictedPlantDisease.ClassName.Should().Be("Ca_chua___Chay_la_som");
        result.PredictedPlantDisease.Plant.Name.Should().Be("Ca_chua");
        result.PredictedPlantDisease.Disease.Name.Should().Be("Chay_la_som");
        result.PredictionDetails.Should().HaveCount(2);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedPrediction = await dbContext.Predictions
            .Include(prediction => prediction.PredictionDetails)
            .SingleAsync(prediction => prediction.Id == result.Id);

        persistedPrediction.Confidence.Should().BeApproximately(0.94, 0.0001);
        persistedPrediction.PredictionDetails.Should().HaveCount(2);
        persistedPrediction.ResultSnapshotJson.Should().NotBeNull();
        (await dbContext.PredictionImages.CountAsync(image => image.PredictionId == result.Id)).Should().Be(1);
    }

    [Fact]
    public async Task GuestPrediction_ShouldNotCreatePersonalHistory()
    {
        using var client = _factory.CreateClient();
        using var request = CreateImageRequest("leaf.jpg", "image/jpeg");
        var response = await client.PostAsync("/api/predictions", request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Predictions.AnyAsync(prediction => prediction.Id == result.Id)).Should().BeFalse();
        result.Images.Should().BeEmpty();
    }

    [Fact]
    public async Task StoredSnapshot_ShouldSurviveCatalogChangesAndExpiry_AndRequireOwner()
    {
        using var owner = _factory.CreateClient();
        using var other = _factory.CreateClient();
        await LoginAsync(owner);
        await LoginAsync(other);
        using var request = CreateImageRequest("leaf.jpg", "image/jpeg");
        var created = await owner.PostAsync("/api/predictions", request);
        created.EnsureSuccessStatusCode();
        var result = (await created.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var image = await db.PredictionImages.SingleAsync(image => image.PredictionId == result.Id);
            image.UploadedAt = DateTime.UtcNow.AddDays(-31);
            image.ExpiresAt = image.UploadedAt.AddDays(30);
            // A second image proves the migrated relation supports all images in a history record.
            db.PredictionImages.Add(new()
            {
                PredictionId = result.Id, Position = 1, Confidence = 0.94,
                UploadedAt = image.UploadedAt, ExpiresAt = image.ExpiresAt,
                ImagePath = "https://images.test/second.jpg", ImagePublicId = "integration/second.jpg"
            });
            var disease = await db.Diseases.SingleAsync(disease => disease.Id == result.PredictedPlantDisease.Disease.Id);
            disease.Description = "Edited after prediction";
            disease.IsContentApproved = true;
            await db.SaveChangesAsync();
        }
        (await other.GetAsync($"/api/predictions/{result.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var guest = _factory.CreateClient();
        (await guest.GetAsync($"/api/predictions/{result.Id}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ImageExpiryCleanup.RunAsync(_factory.Services)).Should().Be(0);
        (await ImageExpiryCleanup.RunAsync(_factory.Services)).Should().Be(0);
        var stored = (await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{result.Id}"))!;
        stored.PredictedPlantDisease.Disease.Description.Should().Be(result.PredictedPlantDisease.Disease.Description);
        stored.Images.Should().HaveCount(2).And.OnlyContain(image => image.IsExpired && image.ImagePath == null);
        stored.ImagePath.Should().BeEmpty();
        await using var verification = _factory.Services.CreateAsyncScope();
        var context = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        (await context.Predictions.AnyAsync(prediction => prediction.Id == result.Id)).Should().BeTrue();
        (await owner.DeleteAsync($"/api/predictions/{result.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private static async Task LoginAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Persistence Test", $"persistence_{Guid.NewGuid():N}@example.com", "Password123!"));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
    }

    [Fact]
    public async Task ExpiryCleanup_ShouldRetainImageMetadataAndHistory_WhenStorageDeletionFails()
    {
        using var owner = _factory.CreateClient();
        await LoginAsync(owner);
        using var request = CreateImageRequest("cleanup-failure.jpg", "image/jpeg");
        var created = await owner.PostAsync("/api/predictions", request);
        created.EnsureSuccessStatusCode();
        var result = (await created.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var image = await db.PredictionImages.SingleAsync(image => image.PredictionId == result.Id);
            image.UploadedAt = DateTime.UtcNow.AddDays(-31);
            image.ExpiresAt = image.UploadedAt.AddDays(30);
            await db.SaveChangesAsync();
        }
        using var failingStorage = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage, FailingDeletionStorage>();
        }));
        (await ImageExpiryCleanup.RunAsync(failingStorage.Services)).Should().Be(1);
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var image = await db.PredictionImages.SingleAsync(image => image.PredictionId == result.Id);
            image.DeletedAt.Should().BeNull();
            image.ImagePath.Should().NotBeNull();
            (await db.Predictions.AnyAsync(prediction => prediction.Id == result.Id)).Should().BeTrue();
        }
        (await ImageExpiryCleanup.RunAsync(_factory.Services)).Should().Be(0);
        (await owner.DeleteAsync($"/api/predictions/{result.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task ExpiryCleanup_ShouldRetainMissingPublicIdMetadata_AndRetryAfterRepair(string? missingPublicId)
    {
        using var owner = _factory.CreateClient();
        await LoginAsync(owner);
        using var request = CreateImageRequest("missing-public-id.jpg", "image/jpeg");
        var created = await owner.PostAsync("/api/predictions", request);
        created.EnsureSuccessStatusCode();
        var result = (await created.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var prediction = await db.Predictions.Include(item => item.Images).SingleAsync(item => item.Id == result.Id);
        var image = prediction.Images.Single();
        var snapshot = prediction.ResultSnapshotJson;
        image.UploadedAt = DateTime.UtcNow.AddDays(-31);
        image.ExpiresAt = image.UploadedAt.AddDays(30);
        image.ImagePublicId = missingPublicId;
        prediction.ImagePublicId = missingPublicId;
        await db.SaveChangesAsync();

        try
        {
            // Repeated runs must keep the unresolved image available for repair/retry.
            for (var attempt = 0; attempt < 2; attempt++)
            {
                (await ImageExpiryCleanup.RunAsync(_factory.Services)).Should().Be(1);
                await db.Entry(image).ReloadAsync();
                await db.Entry(prediction).ReloadAsync();
                image.DeletedAt.Should().BeNull();
                image.ImagePath.Should().Be(result.ImagePath);
                image.ImagePublicId.Should().Be(missingPublicId);
                prediction.ImagePath.Should().Be(result.ImagePath);
                prediction.ImagePublicId.Should().Be(missingPublicId);
                prediction.ResultSnapshotJson.Should().Be(snapshot);
            }
            var stored = (await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{result.Id}"))!;
            stored.ImagePath.Should().BeEmpty();
            stored.Images.Single().ImagePath.Should().BeNull();
            stored.Images.Single().IsExpired.Should().BeTrue();

            image.ImagePublicId = result.ImagePublicId;
            prediction.ImagePublicId = result.ImagePublicId;
            await db.SaveChangesAsync();
            (await ImageExpiryCleanup.RunAsync(_factory.Services)).Should().Be(0);
            await db.Entry(image).ReloadAsync();
            await db.Entry(prediction).ReloadAsync();
            image.DeletedAt.Should().NotBeNull();
            image.ImagePath.Should().BeNull();
            image.ImagePublicId.Should().BeNull();
            prediction.ImagePath.Should().BeEmpty();
            prediction.ImagePublicId.Should().BeNull();
            prediction.ResultSnapshotJson.Should().Be(snapshot);
        }
        finally
        {
            // Remove only this test's fake-storage fixture, even if an assertion fails.
            await db.Predictions.Where(item => item.Id == result.Id).ExecuteDeleteAsync();
        }
    }

    private sealed class FailingDeletionStorage : IImageStorage
    {
        public Task<ImageUploadResult> UploadImageAsync(Microsoft.AspNetCore.Http.IFormFile file, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default) => Task.FromResult(false);
    }

    [Fact]
    public async Task CreatePrediction_ShouldReturnBadRequest_WhenFileExtensionIsInvalid()
    {
        // Arrange
        using var request = CreateImageRequest("leaf.txt", "text/plain");

        // Act
        var response = await _client.PostAsync("/api/predictions", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var responseBody = await response.Content.ReadAsStringAsync();
        responseBody.Should().Contain("Invalid file extension");
    }

    [Fact]
    public async Task CreatePrediction_ShouldReturn503_WhenAiIsUnavailable()
    {
        using var application = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPlantDiseasePredictor>();
                services.AddHttpClient<IPlantDiseasePredictor, FastApiPlantDiseasePredictor>();
            }));
        using var client = application.CreateClient();
        using var request = CreateImageRequest("leaf.jpg", "image/jpeg");

        var response = await client.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        (await response.Content.ReadAsStringAsync()).Should().Contain("AI service is unavailable");
    }

    private static MultipartFormDataContent CreateImageRequest(string fileName, string contentType)
    {
        var imageContent = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x01]);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var request = new MultipartFormDataContent();
        request.Add(imageContent, "file", fileName);
        return request;
    }
}
