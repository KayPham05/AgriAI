using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Services;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Services;

public sealed class RealR2FactAttribute : FactAttribute
{
    public RealR2FactAttribute()
    {
        if (Environment.GetEnvironmentVariable("AGRIVISION_REAL_R2") != "1")
            Skip = "Opt in with AGRIVISION_REAL_R2=1 and a private dev bucket configuration.";
    }
}

[Trait("Category", "RealR2")]
public class RealR2StorageTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [RealR2Fact]
    public async Task RealBucket_UploadReadOwnerIsolationDeleteAndExpiry()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddScoped<IImageStorage, R2ImageStorage>();
        }));
        using var owner = app.CreateClient();
        using var other = app.CreateClient();
        using var guest = app.CreateClient();
        await Register(owner);
        await Register(other);
        await using var scope = app.Services.CreateAsyncScope();
        var storage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        scope.ServiceProvider.GetRequiredService<IConfiguration>()["R2:BucketName"].Should().Be("agrivision-images-dev", "cloud acceptance is scoped to the agreed dev bucket");
        var keys = new List<string>();
        try
        {
            foreach (var client in new[] { owner, other })
            {
                using var form = new MultipartFormDataContent();
                var bytes = new ByteArrayContent([1, 2, 3]);
                bytes.Headers.ContentType = new MediaTypeHeaderValue("image/png");
                form.Add(bytes, "file", "same-name.PNG");
                using var response = await client.PostAsync("/api/predictions", form);
                response.StatusCode.Should().Be(HttpStatusCode.Created);
                var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
                keys.Add(result.ImagePublicId!);
                var entity = await db.Predictions.Include(p => p.Images).SingleAsync(p => p.Id == result.Id);
                var image = entity.Images.Single();
                result.ImagePublicId.Should().Be($"users/{entity.UserId:D}/predictions/{result.Id:D}/{image.Id:D}.png");
                using var download = await client.GetAsync(result.ImagePath);
                download.StatusCode.Should().Be(HttpStatusCode.OK);
                (await download.Content.ReadAsByteArrayAsync()).Should().Equal(1, 2, 3);
                download.Headers.CacheControl!.NoStore.Should().BeTrue();
                download.Headers.GetValues("X-Content-Type-Options").Should().Contain("nosniff");
                (await guest.GetAsync(result.ImagePath)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
                (await (client == owner ? other : owner).GetAsync(result.ImagePath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
                var endpoint = scope.ServiceProvider.GetRequiredService<IConfiguration>()["R2:ServiceUrl"]!.TrimEnd('/');
                using var anonymous = new HttpClient();
                (await anonymous.GetAsync($"{endpoint}/{scope.ServiceProvider.GetRequiredService<IConfiguration>()["R2:BucketName"]}/{result.ImagePublicId}")).IsSuccessStatusCode.Should().BeFalse();
                if (client == owner)
                {
                    image.UploadedAt = DateTime.UtcNow.AddDays(-31);
                    image.ExpiresAt = image.UploadedAt.AddDays(30);
                    await db.SaveChangesAsync();
                    (await owner.GetAsync(result.ImagePath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
                    (await ImageExpiryCleanup.RunAsync(app.Services)).Should().Be(0);
                    (await ImageExpiryCleanup.RunAsync(app.Services)).Should().Be(0);
                    (await db.Predictions.AnyAsync(p => p.Id == result.Id)).Should().BeTrue();
                    (await storage.ReadImageAsync(result.ImagePublicId!)).Should().BeNull();
                }
                (await client.DeleteAsync($"/api/predictions/{result.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
                (await storage.ReadImageAsync(result.ImagePublicId!)).Should().BeNull();
                (await storage.DeleteImageAsync(result.ImagePublicId!)).Should().BeTrue();
            }
            keys.Distinct().Should().HaveCount(2);
        }
        finally
        {
            foreach (var key in keys) await storage.DeleteImageAsync(key);
        }
    }

    private static async Task<AuthResponse> Register(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("R2 fixture", $"r2_{Guid.NewGuid():N}@example.test", "Password123!"));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }
}
