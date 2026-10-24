using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Services;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Controllers;

public class HistoryPersistenceTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    private const string Password = "Password123!";

    [Fact]
    public async Task PredictionWithoutProfile_ShouldPersistCompleteHistory_AndReloadInANewSession()
    {
        using var creator = factory.CreateClient();
        var account = await RegisterAsync(creator);
        var created = await PredictAsync(creator);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saved = await db.Predictions.AsNoTracking().Include(item => item.Images)
                .Include(item => item.PredictionDetails).SingleAsync(item => item.Id == created.Id);
            saved.UserId.Should().Be(account.User.Id);
            saved.AgriculturalProfileId.Should().BeNull();
            saved.CreatedAt.Should().BeCloseTo(created.CreatedAt, TimeSpan.FromMilliseconds(1));
            saved.Confidence.Should().BeApproximately(0.94, 0.0001);
            saved.PredictedPlantDiseaseId.Should().Be(created.PredictedPlantDisease.Id);
            saved.ImagePath.Should().Be("https://images.test/history.jpg");
            saved.ImagePublicId.Should().Be("integration/history.jpg");
            saved.PredictionDetails.OrderBy(item => item.Rank).Select(item => item.Rank).Should().Equal(1, 2);
            saved.PredictionDetails.OrderBy(item => item.Rank).Select(item => item.Probability)
                .Should().Equal((double)0.94f, (double)0.06f);
            var image = saved.Images.Should().ContainSingle().Subject;
            image.UploadedAt.Should().Be(saved.CreatedAt);
            image.ExpiresAt.Should().Be(saved.CreatedAt.AddDays(30));
            image.ImagePath.Should().Be(saved.ImagePath);
            var snapshot = JsonSerializer.Deserialize<PredictionResultDto>(saved.ResultSnapshotJson!, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            snapshot.Should().BeEquivalentTo(created);
        }

        using var reader = factory.CreateClient();
        using var login = await reader.PostAsJsonAsync("/api/auth/login", new LoginRequest(account.User.Email, Password));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var session = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;
        Authorize(reader, session.Token);
        var detail = (await reader.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{created.Id}"))!;
        detail.PredictedPlantDisease.Should().BeEquivalentTo(created.PredictedPlantDisease);
        detail.PredictionDetails.Should().BeEquivalentTo(created.PredictionDetails, options => options.WithStrictOrdering());
        detail.HasHistoricalSnapshot.Should().BeTrue();
        var history = (await reader.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions"))!;
        history.TotalCount.Should().Be(1);
        var item = history.Items.Should().ContainSingle().Subject;
        item.Id.Should().Be(created.Id);
        item.PlantName.Should().Be("Ca_chua");
        item.DiseaseName.Should().Be("Chay_la_som");
        item.ImagePath.Should().Be(created.ImagePath);
    }

    [Fact]
    public async Task HistoryPagination_ShouldUseStableOrder_AndExcludeOtherAccounts()
    {
        using var owner = factory.CreateClient();
        using var other = factory.CreateClient();
        var account = await RegisterAsync(owner);
        var foreign = await RegisterAsync(other);
        var firstId = Guid.Parse("11111111-1111-1111-1111-111111111101");
        var secondId = Guid.Parse("11111111-1111-1111-1111-111111111102");
        var thirdId = Guid.Parse("11111111-1111-1111-1111-111111111103");
        var timestamp = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var plantDiseaseId = await db.PlantDiseases.Where(item => item.ClassIndex == 0).Select(item => item.Id).SingleAsync();
            foreach (var id in new[] { firstId, secondId, thirdId })
                db.Predictions.Add(new Prediction { Id = id, UserId = account.User.Id, PredictedPlantDiseaseId = plantDiseaseId, Confidence = 0.9, CreatedAt = timestamp });
            db.Predictions.Add(new Prediction { UserId = foreign.User.Id, PredictedPlantDiseaseId = plantDiseaseId, Confidence = 0.9, CreatedAt = timestamp.AddDays(1) });
            await db.SaveChangesAsync();
        }

        var page1 = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions?pageNumber=1&pageSize=2"))!;
        var page2 = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions?pageNumber=2&pageSize=2"))!;
        page1.TotalCount.Should().Be(3);
        page1.TotalPages.Should().Be(2);
        page1.HasPreviousPage.Should().BeFalse();
        page1.HasNextPage.Should().BeTrue();
        page1.Items.Select(item => item.Id).Should().Equal(thirdId, secondId);
        page2.TotalCount.Should().Be(3);
        page2.HasPreviousPage.Should().BeTrue();
        page2.HasNextPage.Should().BeFalse();
        page2.Items.Select(item => item.Id).Should().Equal(firstId);
        using var foreignLookup = await other.GetAsync($"/api/predictions/{firstId}");
        foreignLookup.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task HistoryListAndDetail_ShouldKeepSnapshotLabels_WhenCatalogChangesAndImageExpires()
    {
        using var owner = factory.CreateClient();
        await RegisterAsync(owner);
        var created = await PredictAsync(owner);
        string originalName;
        string snapshotBefore;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var plant = await db.Plants.SingleAsync(item => item.Id == created.PredictedPlantDisease.Plant.Id);
            originalName = plant.Name;
            plant.Name = "Changed after diagnosis";
            var saved = await db.Predictions.Include(item => item.Images).SingleAsync(item => item.Id == created.Id);
            snapshotBefore = saved.ResultSnapshotJson!;
            var image = saved.Images.Single();
            image.UploadedAt = DateTime.UtcNow.AddDays(-31);
            image.ExpiresAt = image.UploadedAt.AddDays(30);
            await db.SaveChangesAsync();
        }
        try
        {
            var detail = (await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{created.Id}"))!;
            var history = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions"))!;
            detail.PredictedPlantDisease.Should().BeEquivalentTo(created.PredictedPlantDisease);
            detail.PredictionDetails.Should().BeEquivalentTo(created.PredictionDetails, options => options.WithStrictOrdering());
            detail.ImagePath.Should().BeEmpty();
            detail.ImagePublicId.Should().BeNull();
            detail.Images.Should().ContainSingle().Which.IsExpired.Should().BeTrue();
            var item = history.Items.Should().ContainSingle().Subject;
            item.PlantName.Should().Be(originalName);
            item.ImagePath.Should().BeEmpty();
            item.Images.Should().OnlyContain(image => image.IsExpired && image.ImagePath == null);
            await using var scope = factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saved = await db.Predictions.AsNoTracking().Include(prediction => prediction.Images).SingleAsync(prediction => prediction.Id == created.Id);
            saved.ResultSnapshotJson.Should().Be(snapshotBefore);
            saved.Images.Single().ImagePath.Should().Be(created.ImagePath, "expiry projection must retain persisted metadata until cleanup");
        }
        finally
        {
            await using var scope = factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Plants.Where(item => item.Id == created.PredictedPlantDisease.Plant.Id)
                .ExecuteUpdateAsync(update => update.SetProperty(item => item.Name, originalName));
        }
    }

    [Fact]
    public async Task GuestPrediction_ShouldLeaveStoredUserHistoryAndStorageUntouched()
    {
        var storage = new RecordingStorage();
        using var application = WithStorage(storage);
        using var owner = application.CreateClient();
        await RegisterAsync(owner);
        var saved = await PredictAsync(owner);
        var before = await ReadCountsAsync();
        var historyBefore = await owner.GetStringAsync("/api/predictions");
        using var guest = application.CreateClient();
        using var request = CreateImageRequest();

        using var response = await guest.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        result.PredictedPlantDisease.Should().BeEquivalentTo(saved.PredictedPlantDisease);
        result.HasHistoricalSnapshot.Should().BeFalse();
        result.Images.Should().BeEmpty();
        result.ImagePath.Should().BeEmpty();
        (await ReadCountsAsync()).Should().Be(before);
        (await owner.GetStringAsync("/api/predictions")).Should().Be(historyBefore);
        storage.UploadedIds.Should().ContainSingle();
        storage.DeletedIds.Should().BeEmpty();
        using var lookup = await owner.GetAsync($"/api/predictions/{result.Id}");
        lookup.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UploadFailure_ShouldNotCreateAnyHistoryRows()
    {
        var storage = new RecordingStorage { UploadError = new IOException("Test upload failure.") };
        using var application = WithStorage(storage);
        using var owner = application.CreateClient();
        await RegisterAsync(owner);
        var before = await ReadCountsAsync();
        using var request = CreateImageRequest();

        using var response = await owner.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await ReadCountsAsync()).Should().Be(before);
        storage.UploadedIds.Should().BeEmpty();
        storage.DeletedIds.Should().BeEmpty();
        storage.ReceivedStream!.CanRead.Should().BeFalse();
    }

    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.BadGateway)]
    public async Task AiFailure_ShouldNotUploadOrPersistUserHistory(HttpStatusCode status)
    {
        var storage = new RecordingStorage();
        using var application = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(new FailingPredictor(status));
        }));
        using var owner = application.CreateClient();
        await RegisterAsync(owner);
        var before = await ReadCountsAsync();
        using var request = CreateImageRequest();

        using var response = await owner.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(status);
        (await ReadCountsAsync()).Should().Be(before);
        storage.UploadedIds.Should().BeEmpty();
        storage.DeletedIds.Should().BeEmpty();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DetailInsertFailure_ShouldRollbackWholeHistory_AndAttemptImageCleanup(bool cleanupFails)
    {
        var storage = new RecordingStorage { CleanupFails = cleanupFails };
        using var application = WithStorage(storage);
        using var owner = application.CreateClient();
        await RegisterAsync(owner);
        var before = await ReadCountsAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Only this class's disposable PostgreSQL database is modified. Existing fixtures remain valid.
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE prediction_details ADD CONSTRAINT history_test_reject_details CHECK (probability < 0) NOT VALID");
        try
        {
            using var request = CreateImageRequest();
            using var response = await owner.PostAsync("/api/predictions", request);

            response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
            (await ReadCountsAsync()).Should().Be(before, "a child insert failure must roll back predictions and images too");
            storage.UploadedIds.Should().ContainSingle();
            storage.DeletedIds.Should().Equal(storage.UploadedIds);
            storage.CleanupToken.IsCancellationRequested.Should().BeFalse();
            (await response.Content.ReadAsStringAsync()).Should().NotContain("Test cleanup failure");
            var history = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions"))!;
            history.TotalCount.Should().Be(0);
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE prediction_details DROP CONSTRAINT history_test_reject_details");
        }
    }

    [Fact]
    public async Task ProfileLifecycle_ShouldKeepSnapshot_AndExposeOnlyCurrentGrouping()
    {
        using var owner = factory.CreateClient();
        using var other = factory.CreateClient();
        await RegisterAsync(owner);
        await RegisterAsync(other);
        var profileId = await CreateProfileAsync(owner);
        using var request = CreateImageRequest();
        request.Add(new StringContent(profileId.ToString()), "agriculturalProfileId");
        using var response = await owner.PostAsync("/api/predictions", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        created.AgriculturalProfileId.Should().Be(profileId);
        await PredictAsync(owner); // An ungrouped result must not appear in the profile filter.

        string? snapshot;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            snapshot = (await db.Predictions.AsNoTracking().SingleAsync(p => p.Id == created.Id)).ResultSnapshotJson;
        }

        using var update = await owner.PutAsJsonAsync($"/api/agricultural-profiles/{profileId}",
            new { name = "Renamed orchard", description = "Updated notes" });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = (await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{created.Id}"))!;
        // PostgreSQL timestamps retain microseconds, whereas .NET timestamps retain 100 ns ticks.
        detail.Should().BeEquivalentTo(created, options => options
            .Using<DateTime>(context => context.Subject.Should().BeCloseTo(context.Expectation, TimeSpan.FromMicroseconds(1)))
            .WhenTypeIs<DateTime>());
        var filtered = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>(
            $"/api/predictions?agriculturalProfileId={profileId}"))!;
        filtered.TotalCount.Should().Be(1);
        filtered.Items.Should().ContainSingle().Which.AgriculturalProfileId.Should().Be(profileId);
        var foreign = (await other.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>(
            $"/api/predictions?agriculturalProfileId={profileId}"))!;
        foreign.TotalCount.Should().Be(0);
        (await other.GetAsync($"/api/predictions/{created.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var deletion = await owner.DeleteAsync($"/api/agricultural-profiles/{profileId}");
        deletion.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var retained = (await owner.GetFromJsonAsync<PredictionResultDto>($"/api/predictions/{created.Id}"))!;
        retained.Should().BeEquivalentTo(created with { AgriculturalProfileId = null }, options => options
            .Using<DateTime>(context => context.Subject.Should().BeCloseTo(context.Expectation, TimeSpan.FromMicroseconds(1)))
            .WhenTypeIs<DateTime>());
        var history = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions"))!;
        history.TotalCount.Should().Be(2);
        history.Items.Single(p => p.Id == created.Id).AgriculturalProfileId.Should().BeNull();
        var deletedGroup = (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>(
            $"/api/predictions?agriculturalProfileId={profileId}"))!;
        deletedGroup.TotalCount.Should().Be(0);
        await using var finalScope = factory.Services.CreateAsyncScope();
        var finalDb = finalScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await finalDb.Predictions.AsNoTracking().SingleAsync(p => p.Id == created.Id);
        saved.ResultSnapshotJson.Should().Be(snapshot, "profile edits/deletion must not rewrite diagnosis content");
        saved.AgriculturalProfileId.Should().BeNull();
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task InvalidProfileId_ShouldReturnBadRequest_BeforeExternalWork(string profileId)
    {
        var storage = new RecordingStorage();
        using var application = WithRejectingPredictor(storage);
        using var owner = application.CreateClient();
        await RegisterAsync(owner);
        var before = await ReadCountsAsync();
        using var request = CreateImageRequest();
        request.Add(new StringContent(profileId), "agriculturalProfileId");

        using var response = await owner.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await ReadCountsAsync()).Should().Be(before);
        storage.UploadedIds.Should().BeEmpty();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UnavailableProfile_ShouldReturnNotFound_BeforeExternalWork(bool foreign)
    {
        var storage = new RecordingStorage();
        using var application = WithRejectingPredictor(storage);
        using var owner = application.CreateClient();
        using var requester = application.CreateClient();
        await RegisterAsync(owner);
        await RegisterAsync(requester);
        var profileId = foreign ? await CreateProfileAsync(owner) : Guid.NewGuid();
        var before = await ReadCountsAsync();
        using var request = CreateImageRequest();
        request.Add(new StringContent(profileId.ToString()), "agriculturalProfileId");

        using var response = await requester.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await ReadCountsAsync()).Should().Be(before);
        storage.UploadedIds.Should().BeEmpty();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ProfileDeletedDuringUpload_ShouldRejectSave_RollbackAndAttemptCleanup(bool cleanupFails)
    {
        using var profileOwner = factory.CreateClient();
        var account = await RegisterAsync(profileOwner);
        var profileId = await CreateProfileAsync(profileOwner);
        var storage = new RecordingStorage
        {
            CleanupFails = cleanupFails,
            BeforeUploadReturns = async () =>
            {
                using var deletion = await profileOwner.DeleteAsync($"/api/agricultural-profiles/{profileId}");
                deletion.StatusCode.Should().Be(HttpStatusCode.NoContent);
            }
        };
        using var application = WithStorage(storage);
        using var owner = application.CreateClient();
        Authorize(owner, account.Token);
        var before = await ReadCountsAsync();
        using var request = CreateImageRequest();
        request.Add(new StringContent(profileId.ToString()), "agriculturalProfileId");

        using var response = await owner.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await ReadCountsAsync()).Should().Be(before);
        storage.UploadedIds.Should().ContainSingle();
        storage.DeletedIds.Should().Equal(storage.UploadedIds);
        storage.CleanupToken.IsCancellationRequested.Should().BeFalse();
        storage.ReceivedStream!.CanRead.Should().BeFalse();
        (await owner.GetFromJsonAsync<PagedResult<PredictionHistoryDto>>("/api/predictions"))!.TotalCount.Should().Be(0);
        (await response.Content.ReadAsStringAsync()).Should().NotContain("Test cleanup failure");
    }

    private WebApplicationFactory<Program> WithRejectingPredictor(RecordingStorage storage) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(new FailingPredictor(HttpStatusCode.BadGateway));
        }));

    private static async Task<Guid> CreateProfileAsync(HttpClient owner)
    {
        using var response = await owner.PostAsJsonAsync("/api/agricultural-profiles",
            new { name = "History orchard", description = "Initial notes" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private WebApplicationFactory<Program> WithStorage(RecordingStorage storage) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));

    private async Task<(int Predictions, int Images, int Details)> ReadCountsAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Predictions.CountAsync(), await db.PredictionImages.CountAsync(), await db.PredictionDetails.CountAsync());
    }

    private static async Task<AuthResponse> RegisterAsync(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("History test", $"history_{Guid.NewGuid():N}@example.test", Password));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var account = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        Authorize(client, account.Token);
        return account;
    }

    private static void Authorize(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static async Task<PredictionResultDto> PredictAsync(HttpClient client)
    {
        using var request = CreateImageRequest();
        using var response = await client.PostAsync("/api/predictions", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().EndWith($"/{result.Id}", "CreatedAtAction must identify the saved result");
        return result;
    }

    private static MultipartFormDataContent CreateImageRequest()
    {
        var request = new MultipartFormDataContent();
        var bytes = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x01]);
        bytes.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        request.Add(bytes, "file", "history.jpg");
        return request;
    }

    private sealed class RecordingStorage : IImageStorage
    {
        public Exception? UploadError { get; init; }
        public bool CleanupFails { get; init; }
        public Func<Task>? BeforeUploadReturns { get; init; }
        public List<string> UploadedIds { get; } = [];
        public List<string> DeletedIds { get; } = [];
        public Stream? ReceivedStream { get; private set; }
        public CancellationToken CleanupToken { get; private set; }

        public Task<ImageUploadResult> UploadImageAsync(IFormFile file, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException("The prediction service uploads a stream.");

        public async Task<ImageUploadResult> UploadImageAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
        {
            ReceivedStream = stream;
            await stream.CopyToAsync(Stream.Null, cancellationToken);
            if (UploadError != null) throw UploadError;
            var id = $"history-test/{Guid.NewGuid():N}";
            UploadedIds.Add(id);
            if (BeforeUploadReturns != null) await BeforeUploadReturns();
            return new ImageUploadResult(id, $"https://images.test/{id}.jpg");
        }

        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
        {
            CleanupToken = cancellationToken;
            DeletedIds.Add(publicId);
            if (CleanupFails) throw new IOException("Test cleanup failure.");
            return Task.FromResult(true);
        }
    }

    private sealed class FailingPredictor(HttpStatusCode status) : IPlantDiseasePredictor
    {
        public Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<AiPredictionResult> PredictAsync(Stream stream, string fileName, CancellationToken cancellationToken = default) =>
            throw new AiServiceException("Test AI failure.", status);
    }
}
