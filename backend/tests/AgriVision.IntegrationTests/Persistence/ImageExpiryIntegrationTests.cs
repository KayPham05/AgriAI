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
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.IntegrationTests.Persistence;

public class ImageExpiryIntegrationTests : IClassFixture<AgriVisionFactory>
{
    private readonly AgriVisionFactory _factory;

    public ImageExpiryIntegrationTests(AgriVisionFactory factory)
    {
        _factory = factory;
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
        public Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ImageDownloadResult?>(null);
        public Task<ImageUploadResult> UploadImageAsync(Microsoft.AspNetCore.Http.IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default) => Task.FromResult(false);
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
