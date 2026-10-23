using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Persistence;

public class UploadJournalIntegrationTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{








    [Fact]
    public async Task ConcurrentQuotaReservations_AreSerializedAcrossContexts()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.UseSetting("StorageLimits:MaxImagesPerUser", "1"));
        using var client = app.CreateClient();
        var auth = await Register(client);
        async Task<bool> Reserve()
        {
            await using var scope = app.Services.CreateAsyncScope();
            var context = new ImageStorageContext(auth.User.Id, Guid.NewGuid(), Guid.NewGuid());
            try
            {
                await scope.ServiceProvider.GetRequiredService<IImageUploadJournal>().ReserveAsync(context, ImageStorageKey.Create(context, ".png"), default);
                return true;
            }
            catch (ArgumentException) { return false; }
        }
        (await Task.WhenAll(Reserve(), Reserve())).Count(success => success).Should().Be(1);
    }

    [Fact]
    public async Task PendingCleanup_RetriesFailure_PreservesRecentAndReferencedObjects()
    {
        using var owner = factory.CreateClient();
        var auth = await Register(owner);
        using var form = Image();
        var created = await owner.PostAsync("/api/predictions", form);
        created.EnsureSuccessStatusCode();
        var prediction = (await created.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        var storage = new RecordingStorage { Fail = true };
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staleKey = ImageStorageKey.Create(new(auth.User.Id, Guid.NewGuid(), Guid.NewGuid()), ".png");
        var recentKey = ImageStorageKey.Create(new(auth.User.Id, Guid.NewGuid(), Guid.NewGuid()), ".png");
        db.PendingImageUploads.AddRange(
            new PendingImageUpload { Key = staleKey, UserId = auth.User.Id, CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new PendingImageUpload { Key = recentKey, UserId = auth.User.Id },
            new PendingImageUpload { Key = prediction.ImagePublicId!, UserId = auth.User.Id, CreatedAt = DateTime.UtcNow.AddHours(-2) });
        await db.SaveChangesAsync();
        (await ImageExpiryCleanup.RunAsync(app.Services)).Should().Be(1);
        (await db.PendingImageUploads.AsNoTracking().AnyAsync(item => item.Key == staleKey)).Should().BeTrue();
        storage.Fail = false;
        (await ImageExpiryCleanup.RunAsync(app.Services)).Should().Be(0);
        (await db.PendingImageUploads.AsNoTracking().AnyAsync(item => item.Key == staleKey)).Should().BeFalse();
        (await db.PendingImageUploads.AsNoTracking().AnyAsync(item => item.Key == recentKey)).Should().BeTrue();
        storage.Deleted.Should().Equal(staleKey);
        (await db.Predictions.AnyAsync(item => item.Id == prediction.Id)).Should().BeTrue();
    }

    private static MultipartFormDataContent Image()
    {
        var form = new MultipartFormDataContent();
        var bytes = new ByteArrayContent([1, 2, 3]);
        bytes.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(bytes, "file", "leaf.png");
        return form;
    }

    private static async Task<AuthResponse> Register(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Security fixture", $"security_{Guid.NewGuid():N}@example.test", "Password123!"));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }



    private sealed class RecordingStorage : IImageStorage
    {
        public bool Fail { get; set; }
        public List<string> Deleted { get; } = [];
        public Task<bool> DeleteImageAsync(string key, CancellationToken cancellationToken = default)
        {
            if (Fail) throw new IOException("synthetic outage");
            Deleted.Add(key);
            return Task.FromResult(true);
        }
        public Task<ImageDownloadResult?> ReadImageAsync(string key, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Microsoft.AspNetCore.Http.IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
