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

namespace AgriVision.ApiTests.Controllers;

public class StorageSecurityTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Trait("ApiCase", "existing.StorageSecurityTests.GuestBudget_RejectsSecondRequest_WithRetryAfter")]
    [Fact]
    public async Task GuestBudget_RejectsSecondRequest_WithRetryAfter()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.UseSetting("TrafficLimits:PredictionRequestsPerMinute", "1"));
        using var client = app.CreateClient();
        using var first = Image();
        (await client.PostAsync("/api/predictions", first)).StatusCode.Should().Be(HttpStatusCode.OK);
        using var second = Image();
        var response = await client.PostAsync("/api/predictions", second);
        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        response.Headers.RetryAfter.Should().NotBeNull();
    }

    [Trait("ApiCase", "existing.StorageSecurityTests.ConcurrencyBudget_RejectsNinthInference_AndReleasesPermits")]
    [Fact]
    public async Task ConcurrencyBudget_RejectsNinthInference_AndReleasesPermits()
    {
        var predictor = new BlockingPredictor();
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(predictor);
        }));
        using var client = app.CreateClient();
        var forms = Enumerable.Range(0, 8).Select(_ => Image()).ToArray();
        var requests = forms.Select(form => client.PostAsync("/api/predictions", form)).ToArray();
        try
        {
            await predictor.Started.Task.WaitAsync(TimeSpan.FromSeconds(30));
            using var ninth = Image();
            (await client.PostAsync("/api/predictions", ninth)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        }
        finally { predictor.Release.TrySetResult(); }
        foreach (var response in await Task.WhenAll(requests)) response.StatusCode.Should().Be(HttpStatusCode.OK);
        foreach (var form in forms) form.Dispose();
        using var next = Image();
        (await client.PostAsync("/api/predictions", next)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Trait("ApiCase", "existing.StorageSecurityTests.Quota_RejectsSecondStoredImage_WithoutLeavingPendingUpload")]
    [Fact]
    public async Task Quota_RejectsSecondStoredImage_WithoutLeavingPendingUpload()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.UseSetting("StorageLimits:MaxImagesPerUser", "1"));
        using var client = app.CreateClient();
        var auth = await Register(client);
        using var first = Image();
        (await client.PostAsync("/api/predictions", first)).StatusCode.Should().Be(HttpStatusCode.Created);
        using var second = Image();
        (await client.PostAsync("/api/predictions", second)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.PredictionImages.CountAsync(image => image.Prediction.UserId == auth.User.Id)).Should().Be(1);
        (await db.PendingImageUploads.CountAsync(item => item.UserId == auth.User.Id)).Should().Be(0);
    }

    [Trait("ApiCase", "existing.StorageSecurityTests.DownloadBudget_IsPerOwner_AndLogoutRevokesOnlyCurrentSession")]
    [Fact]
    public async Task DownloadBudget_IsPerOwner_AndLogoutRevokesOnlyCurrentSession()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.UseSetting("TrafficLimits:ImageRequestsPerMinute", "1"));
        using var owner = app.CreateClient();
        using var other = app.CreateClient();
        await Register(owner);
        await Register(other);
        using var form = Image();
        var response = await owner.PostAsync("/api/predictions", form);
        var image = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!.ImagePath;
        (await owner.GetAsync(image)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await owner.GetAsync(image)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await other.GetAsync(image)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.PostAsync("/api/auth/logout", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await other.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);
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

    private sealed class BlockingPredictor : IPlantDiseasePredictor
    {
        private int _started;
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public Task<AiPredictionResult> PredictAsync(Microsoft.AspNetCore.Http.IFormFile file, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public async Task<AiPredictionResult> PredictAsync(Stream stream, string name, CancellationToken cancellationToken = default)
        {
            if (Interlocked.Increment(ref _started) == 8) Started.TrySetResult();
            await Release.Task.WaitAsync(cancellationToken);
            return new(0, "Ca_chua___Chay_la_som", 0.94f, [new(0, "Ca_chua___Chay_la_som", 0.94f)]);
        }
    }


}
