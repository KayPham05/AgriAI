using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Services;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public class PredictionContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("missing")]
    [InlineData("empty")]
    [InlineData("extension")]
    [Trait("ApiCase", "predictions.invalid_multipart")]
    public async Task InvalidUpload_IsRejectedBeforeInferenceOrStorage(string mode)
    {
        var predictor = new PredictDouble();
        var storage = new StorageDouble();
        using var app = App(predictor, storage);
        using var client = app.CreateClient();
        using var form = mode == "missing" ? new MultipartFormDataContent() : Image(mode == "extension" ? "leaf.gif" : "leaf.png", mode == "empty" ? [] : [1, 2, 3]);
        if (mode == "missing") form.Add(new StringContent("leaf"), "unrelated");
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType.Should().Match(type => type == "application/json" || type == "application/problem+json");
        predictor.Calls.Should().Be(0);
        storage.Uploads.Should().Be(0);
    }

    [Fact]
    [Trait("ApiCase", "predictions.multipart_section_limit")]
    public async Task MultipartSection_Over15MiB_IsRejectedBeforeInference()
    {
        var predictor = new PredictDouble();
        var storage = new StorageDouble();
        using var app = App(predictor, storage);
        using var client = app.CreateClient();
        using var form = Image("leaf.png", new byte[15 * 1024 * 1024 + 1]);
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        predictor.Calls.Should().Be(0);
        storage.Uploads.Should().Be(0);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("ApiCase", "predictions.exact_upload_limit")]
    public async Task MultipartSection_Exactly15MiB_IsAccepted(bool authenticated)
    {
        var predictor = new PredictDouble();
        var storage = new StorageDouble();
        using var app = App(predictor, storage);
        using var client = app.CreateClient();
        if (authenticated) await ApiTestClient.Register(client);
        using var scope = app.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = await database.Predictions.CountAsync();
        var bytes = new byte[15 * 1024 * 1024];
        bytes[0] = 0x18;
        bytes[^1] = 0x29;
        using var form = Image("leaf.png", bytes);
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(authenticated ? HttpStatusCode.Created : HttpStatusCode.OK);
        var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        result.Confidence.Should().BeApproximately(.94f, .0001f);
        predictor.Calls.Should().Be(1);
        if (authenticated)
        {
            response.Headers.Location!.AbsolutePath.Should().BeEquivalentTo($"/api/predictions/{result.Id}");
            response.Headers.Location.GetLeftPart(UriPartial.Authority).Should().Be(client.BaseAddress!.GetLeftPart(UriPartial.Authority));
            storage.Objects.Should().ContainSingle();
            var stored = storage.Objects.Single().Value;
            stored.Length.Should().Be(15 * 1024 * 1024);
            System.Security.Cryptography.SHA256.HashData(stored).Should().Equal(System.Security.Cryptography.SHA256.HashData(bytes));
            using var detail = await client.GetAsync(response.Headers.Location);
            detail.StatusCode.Should().Be(HttpStatusCode.OK);
            (await detail.Content.ReadFromJsonAsync<PredictionResultDto>())!.Id.Should().Be(result.Id);
        }
        else
        {
            response.Headers.Location.Should().BeNull();
            storage.Uploads.Should().Be(0);
            storage.Objects.Should().BeEmpty();
            (await database.Predictions.CountAsync()).Should().Be(before);
        }
    }

    [Theory]
    [InlineData("jpg", "image/jpeg")]
    [InlineData("jpeg", "image/jpeg")]
    [InlineData("png", "image/png")]
    [Trait("ApiCase", "predictions.image_formats_contract")]
    public async Task SupportedExtension_StoresExactBytesAndServesPrivateImageHeaders(string extension, string mime)
    {
        byte[] bytes = [0x18, 0x29, 0x3a, 0x4b, 0x5c];
        var storage = new StorageDouble();
        using var app = App(new PredictDouble(), storage);
        using var client = app.CreateClient();
        var auth = await ApiTestClient.Register(client);
        using var form = Image($"leaf.{extension}", bytes);
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("id").GetGuid().Should().NotBeEmpty();
        body.GetProperty("confidence").GetDouble().Should().BeApproximately(.94, .00001);
        body.GetProperty("images").GetArrayLength().Should().Be(1);
        body.GetProperty("predictedPlantDisease").GetProperty("className").GetString().Should().Be("Ca_chua___Chay_la_som");
        response.Headers.Location!.OriginalString.ToLowerInvariant().Should().EndWith($"/api/predictions/{body.GetProperty("id").GetGuid()}");
        var stored = storage.Objects.Single();
        body.GetProperty("imagePublicId").GetString().Should().Be(stored.Key);
        stored.Key.Should().StartWith($"users/{auth.User.Id:D}/predictions/").And.EndWith($".{extension}");
        stored.Value.Should().Equal(bytes);
        using var image = await client.GetAsync(body.GetProperty("imagePath").GetString());
        image.StatusCode.Should().Be(HttpStatusCode.OK);
        image.Content.Headers.ContentType!.MediaType.Should().Be(mime);
        image.Headers.CacheControl!.NoStore.Should().BeTrue();
        image.Headers.GetValues("X-Content-Type-Options").Should().ContainSingle().Which.Should().Be("nosniff");
        (await image.Content.ReadAsByteArrayAsync()).Should().Equal(bytes);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("ApiCase", "predictions.dependency_failure_no_persistence")]
    public async Task FailedAiOrStorage_DoesNotCreateHistoryOrOrphanObject(bool storageFails)
    {
        var predictor = new PredictDouble();
        if (!storageFails) predictor.Run = _ => throw new AiServiceException("Synthetic AI outage", HttpStatusCode.ServiceUnavailable);
        var storage = new StorageDouble { FailUpload = storageFails };
        using var app = App(predictor, storage);
        using var client = app.CreateClient();
        var user = await ApiTestClient.Register(client);
        using var form = Image();
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        (await ApiTestClient.Json(response)).GetProperty("statusCode").GetInt32().Should().Be(503);
        using var history = await client.GetAsync("/api/predictions");
        (await ApiTestClient.Json(history)).GetProperty("totalCount").GetInt32().Should().Be(0);
        storage.Objects.Should().BeEmpty();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Predictions.CountAsync(x => x.UserId == user.User.Id)).Should().Be(0);
        // A failed upload may have reached storage despite a lost ACK; the durable
        // intent must remain for reconciliation rather than pretending it succeeded.
        (await db.PendingImageUploads.CountAsync(x => x.UserId == user.User.Id)).Should().Be(storageFails ? 1 : 0);
    }

    [Fact]
    [Trait("ApiCase", "predictions.missing_object")]
    public async Task MissingStorageObject_ReturnsNotFoundAndKeepsHistory()
    {
        var storage = new StorageDouble();
        using var app = App(new PredictDouble(), storage);
        using var client = app.CreateClient();
        await ApiTestClient.Register(client);
        var result = await Create(client);
        storage.Missing = true;
        using var image = await client.GetAsync(result.ImagePath);
        image.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var detail = await client.GetAsync($"/api/predictions/{result.Id}");
        detail.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    [Trait("ApiCase", "predictions.deleted_image")]
    public async Task DeletedImageMetadata_ReturnsNotFoundWithoutDeletingHistory()
    {
        using var app = App(new PredictDouble(), new StorageDouble());
        using var client = app.CreateClient();
        await ApiTestClient.Register(client);
        var result = await Create(client);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.PredictionImages.Where(x => x.PredictionId == result.Id).ExecuteUpdateAsync(set => set.SetProperty(x => x.DeletedAt, DateTime.UtcNow));
        }
        using var image = await client.GetAsync(result.ImagePath);
        image.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var history = await client.GetAsync("/api/predictions");
        (await ApiTestClient.Json(history)).GetProperty("items").EnumerateArray().Should().Contain(x => x.GetProperty("id").GetGuid() == result.Id);
    }

    [Fact]
    [Trait("ApiCase", "predictions.history_filters_and_pagination")]
    public async Task History_FiltersOwnedRowsAndReturnsCorrectPagingMetadata()
    {
        using var app = App(new PredictDouble(), new StorageDouble());
        using var owner = app.CreateClient();
        using var other = app.CreateClient();
        await ApiTestClient.Register(owner);
        await ApiTestClient.Register(other);
        var first = await Create(owner);
        var second = await Create(owner);
        var foreign = await Create(other);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Predictions.Where(x => x.Id == first.Id).ExecuteUpdateAsync(set => set.SetProperty(x => x.CreatedAt, DateTime.UtcNow.AddHours(-2)));
            await db.Predictions.Where(x => x.Id == second.Id).ExecuteUpdateAsync(set => set.SetProperty(x => x.CreatedAt, DateTime.UtcNow.AddHours(-1)));
        }
        var disease = first.PredictedPlantDisease;
        var filter = $"plantId={disease.PlantId}&diseaseId={disease.DiseaseId}&fromDate={DateTime.UtcNow.AddDays(-1):yyyy-MM-dd}&toDate={DateTime.UtcNow.AddDays(1):yyyy-MM-dd}";
        using var response = await owner.GetAsync($"/api/predictions?{filter}&pageNumber=1&pageSize=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("totalCount").GetInt32().Should().Be(2);
        body.GetProperty("totalPages").GetInt32().Should().Be(2);
        body.GetProperty("pageSize").GetInt32().Should().Be(1);
        body.GetProperty("pageNumber").GetInt32().Should().Be(1);
        body.GetProperty("hasNextPage").GetBoolean().Should().BeTrue();
        var item = body.GetProperty("items").EnumerateArray().Single();
        item.GetProperty("id").GetGuid().Should().Be(second.Id);
        item.GetProperty("id").GetGuid().Should().NotBe(foreign.Id);
        item.GetProperty("plantName").GetString().Should().Be("Ca_chua");
        item.GetProperty("diseaseName").GetString().Should().Be("Chay_la_som");
        item.GetProperty("confidence").GetDouble().Should().BeApproximately(.94, .00001);
        using var next = await owner.GetAsync($"/api/predictions?{filter}&pageNumber=2&pageSize=1");
        (await ApiTestClient.Json(next)).GetProperty("items").EnumerateArray().Single().GetProperty("id").GetGuid().Should().Be(first.Id);
        foreach (var query in new[] { "pageNumber=3&pageSize=1", $"plantId={Guid.NewGuid()}", $"diseaseId={Guid.NewGuid()}", "fromDate=2000-01-01&toDate=2000-01-02" })
        {
            using var empty = await owner.GetAsync($"/api/predictions?{query}");
            empty.StatusCode.Should().Be(HttpStatusCode.OK);
            (await ApiTestClient.Json(empty)).GetProperty("items").GetArrayLength().Should().Be(0, "filter {0} must exclude these predictions", query);
        }
    }

    [Theory]
    [InlineData("pageNumber=0")]
    [InlineData("pageSize=-1")]
    [InlineData("fromDate=2026-12-31&toDate=2026-01-01")]
    [InlineData("plantId=not-a-guid")]
    [Trait("ApiCase", "predictions.history_invalid_filter")]
    public async Task InvalidHistoryFilter_ReturnsBadRequest(string query)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Register(client);
        using var response = await client.GetAsync($"/api/predictions?{query}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    [Trait("ApiCase", "predictions.admin_delete_without_read")]
    public async Task Admin_CanDeleteForeignPredictionButCannotReadItsPrivateResult()
    {
        var storage = new StorageDouble();
        using var app = App(new PredictDouble(), storage);
        using var owner = app.CreateClient();
        using var admin = app.CreateClient();
        await ApiTestClient.Register(owner);
        await ApiTestClient.Admin(admin, factory);
        var result = await Create(owner);
        using var detail = await admin.GetAsync($"/api/predictions/{result.Id}");
        using var image = await admin.GetAsync(result.ImagePath);
        detail.StatusCode.Should().Be(HttpStatusCode.NotFound);
        image.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var delete = await admin.DeleteAsync($"/api/predictions/{result.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var ownerRead = await owner.GetAsync($"/api/predictions/{result.Id}");
        ownerRead.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var ownerImage = await owner.GetAsync(result.ImagePath);
        ownerImage.StatusCode.Should().Be(HttpStatusCode.NotFound);
        storage.Objects.Should().BeEmpty();
    }

    [Fact]
    [Trait("ApiCase", "predictions.rate_same_user_sessions")]
    public async Task UploadBudget_IsSharedAcrossSessionsButIndependentAcrossUsers()
    {
        using var app = App(new PredictDouble(), new StorageDouble(), "TrafficLimits:PredictionRequestsPerMinute", "1");
        using var first = app.CreateClient();
        using var secondSession = app.CreateClient();
        using var other = app.CreateClient();
        var user = await ApiTestClient.Register(first);
        await ApiTestClient.Register(other);
        using var login = await secondSession.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, ApiTestClient.Password));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        secondSession.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", (await login.Content.ReadFromJsonAsync<AuthResponse>())!.Token);
        await Create(first);
        using var form = Image();
        using var limited = await secondSession.PostAsync("/api/predictions", form);
        limited.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        limited.Headers.RetryAfter.Should().NotBeNull();
        (await ApiTestClient.Json(limited)).GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
        await Create(other);
    }

    [Fact]
    [Trait("ApiCase", "auth.rate_limit")]
    public async Task AuthBudget_RejectsRepeatedLoginWithRetryAfter()
    {
        using var app = App(new PredictDouble(), new StorageDouble(), "TrafficLimits:AuthRequestsPerMinute", "1");
        using var client = app.CreateClient();
        using var first = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest($"missing-{Guid.NewGuid():N}@example.test", ApiTestClient.Password));
        first.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var second = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("missing@example.test", ApiTestClient.Password));
        second.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        second.Headers.RetryAfter.Should().NotBeNull();
        (await ApiTestClient.Json(second)).GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
    }

    private WebApplicationFactory<Program> App(PredictDouble predictor, StorageDouble storage, string? setting = null, string? value = null)
        => factory.WithWebHostBuilder(builder =>
        {
            if (setting != null) builder.UseSetting(setting, value);
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPlantDiseasePredictor>();
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IPlantDiseasePredictor>(predictor);
                services.AddSingleton<IImageStorage>(storage);
            });
        });

    private static MultipartFormDataContent Image(string name = "leaf.png", byte[]? bytes = null)
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes ?? [1, 2, 3]);
        file.Headers.ContentType = new MediaTypeHeaderValue(name.EndsWith(".png") ? "image/png" : "image/jpeg");
        form.Add(file, "file", name);
        return form;
    }

    private static async Task<PredictionResultDto> Create(HttpClient client)
    {
        using var form = Image();
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
    }
}
