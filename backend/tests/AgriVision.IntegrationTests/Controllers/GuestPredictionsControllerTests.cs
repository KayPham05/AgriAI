using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.Prediction;
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
using Microsoft.IdentityModel.Tokens;

namespace AgriVision.IntegrationTests.Controllers;

public class GuestPredictionsControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly AgriVisionFactory _factory;

    public GuestPredictionsControllerTests(AgriVisionFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("malformed")]
    [InlineData("expired")]
    [InlineData("wrong-signature")]
    [InlineData("missing-subject")]
    [InlineData("invalid-subject")]
    public async Task Prediction_ShouldRejectInvalidCredentials_InsteadOfRunningAsGuest(string scenario)
    {
        var predictor = new RecordingPredictor();
        var storage = new RejectingStorage();
        using var application = CreateGuestApplication(predictor, storage);
        using var client = application.CreateClient();
        var before = await ReadStoredIdsAsync();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(scenario));
        using var request = CreateImageRequest();

        using var response = await client.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        predictor.Calls.Should().Be(0);
        storage.Calls.Should().Be(0);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    [Fact]
    public async Task GuestPrediction_ShouldReturnFullResult_WithoutStorageOrChangesToUserHistory()
    {
        using var owner = _factory.CreateClient();
        using var registration = await owner.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Guest contract owner", $"guest_contract_{Guid.NewGuid():N}@example.com", "Password123!"));
        registration.EnsureSuccessStatusCode();
        var session = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;
        owner.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        using var ownerRequest = CreateImageRequest();
        using var ownerResponse = await owner.PostAsync("/api/predictions", ownerRequest);
        ownerResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var storedResult = (await ownerResponse.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        var historyBefore = await owner.GetStringAsync("/api/predictions");
        var before = await ReadStoredIdsAsync();

        var predictor = new RecordingPredictor();
        var storage = new RejectingStorage();
        using var application = CreateGuestApplication(predictor, storage);
        using var guest = application.CreateClient();
        using var request = CreateImageRequest();
        // Posted identifiers cannot turn an anonymous request into a persisted prediction.
        request.Add(new StringContent(session.User.Id.ToString()), "userId");
        using var response = await guest.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Location.Should().BeNull();
        var result = (await response.Content.ReadFromJsonAsync<PredictionResultDto>())!;
        result.Id.Should().NotBeEmpty();
        result.PredictedPlantDisease.Should().BeEquivalentTo(storedResult.PredictedPlantDisease);
        result.Confidence.Should().BeApproximately(0.94, 0.0001);
        result.PredictionDetails.Should().BeEquivalentTo(storedResult.PredictionDetails);
        result.Warning.Should().Be(storedResult.Warning);
        result.InformationPending.Should().Be(storedResult.InformationPending);
        result.Medication.Should().Be(storedResult.Medication);
        result.HasHistoricalSnapshot.Should().BeFalse();
        result.ImagePath.Should().BeEmpty();
        result.ImagePublicId.Should().BeNull();
        result.Images.Should().BeEmpty();
        predictor.Calls.Should().Be(1);
        predictor.ImageBytes.Should().Equal(0xFF, 0xD8, 0xFF, 0xE0, 0x01);
        predictor.ReceivedStream!.CanRead.Should().BeFalse("the inference stream is disposed after the request");
        storage.Calls.Should().Be(0);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
        (await owner.GetStringAsync("/api/predictions")).Should().Be(historyBefore);
        using var lookup = await owner.GetAsync($"/api/predictions/{result.Id}");
        lookup.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("GET", "/api/auth/me")]
    [InlineData("GET", "/api/predictions")]
    [InlineData("GET", "/api/predictions/11111111-1111-1111-1111-111111111111")]
    [InlineData("DELETE", "/api/predictions/11111111-1111-1111-1111-111111111111")]
    [InlineData("POST", "/api/plants")]
    [InlineData("POST", "/api/diseases")]
    public async Task Guest_ShouldNotAccessPersonalOrAdminEndpoints(string method, string path)
    {
        using var client = _factory.CreateClient();
        var before = await ReadStoredIdsAsync();
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData("GET", "/api/predictions")]
    [InlineData("DELETE", "/api/predictions/11111111-1111-1111-1111-111111111111")]
    public async Task MissingUserIdentity_ShouldNotAccessHistory(string method, string path)
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken("missing-subject"));
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("leaf.txt", false)]
    [InlineData("leaf.jpg", true)]
    [InlineData(null, false)]
    public async Task InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage(string? fileName, bool empty)
    {
        var predictor = new RecordingPredictor();
        var storage = new RejectingStorage();
        using var application = CreateGuestApplication(predictor, storage);
        using var client = application.CreateClient();
        var before = await ReadStoredIdsAsync();
        using var request = CreateImageRequest(fileName, empty);

        using var response = await client.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        predictor.Calls.Should().Be(0);
        storage.Calls.Should().Be(0);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.BadGateway)]
    public async Task GuestAiFailure_ShouldNotReturnSuccessOrPersistData(HttpStatusCode status)
    {
        var predictor = new RecordingPredictor { Error = new AiServiceException("AI test failure.", status) };
        var storage = new RejectingStorage();
        using var application = CreateGuestApplication(predictor, storage);
        using var client = application.CreateClient();
        var before = await ReadStoredIdsAsync();
        using var request = CreateImageRequest();

        using var response = await client.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(status);
        predictor.Calls.Should().Be(1);
        predictor.ReceivedStream!.CanRead.Should().BeFalse();
        storage.Calls.Should().Be(0);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GuestMappingMismatch_ShouldNotPersistData(bool invalidTopK)
    {
        var predictor = new RecordingPredictor();
        predictor.Result = invalidTopK
            ? predictor.Result with { TopK = [new AiPredictionTopKItem(999, "Unknown", 0.1f)] }
            : predictor.Result with { ClassName = "Unknown" };
        var storage = new RejectingStorage();
        using var application = CreateGuestApplication(predictor, storage);
        using var client = application.CreateClient();
        var before = await ReadStoredIdsAsync();
        using var request = CreateImageRequest();

        using var response = await client.PostAsync("/api/predictions", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        storage.Calls.Should().Be(0);
        (await ReadStoredIdsAsync()).Should().BeEquivalentTo(before);
    }

    private WebApplicationFactory<Program> CreateGuestApplication(RecordingPredictor predictor, RejectingStorage storage) =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>();
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IPlantDiseasePredictor>(predictor);
            services.AddSingleton<IImageStorage>(storage);
        }));

    private async Task<StoredIds> ReadStoredIdsAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return new StoredIds(
            await db.Users.Select(item => item.Id).ToArrayAsync(),
            await db.Predictions.Select(item => item.Id).ToArrayAsync(),
            await db.PredictionImages.Select(item => item.Id).ToArrayAsync(),
            await db.PredictionDetails.Select(item => item.Id).ToArrayAsync());
    }

    private sealed record StoredIds(Guid[] Users, Guid[] Predictions, Guid[] Images, Guid[] Details);

    private static string CreateToken(string scenario)
    {
        if (scenario == "malformed") return "not-a-jwt";

        var claims = new List<Claim>();
        if (scenario != "missing-subject")
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Sub,
                scenario == "invalid-subject" ? "invalid-user-id" : Guid.NewGuid().ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(new string(
            scenario == "wrong-signature" ? 'y' : 'x', 32)));
        var token = new JwtSecurityToken(
            issuer: "AgriVisionAPI",
            audience: "AgriVisionApp",
            claims: claims,
            notBefore: DateTime.UtcNow.AddHours(-1),
            expires: scenario == "expired" ? DateTime.UtcNow.AddMinutes(-10) : DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static MultipartFormDataContent CreateImageRequest(string? fileName = "leaf.jpg", bool empty = false)
    {
        var request = new MultipartFormDataContent();
        if (fileName == null) return request;
        var image = new ByteArrayContent(empty ? [] : [0xFF, 0xD8, 0xFF, 0xE0, 0x01]);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        request.Add(image, "file", fileName);
        return request;
    }

    private sealed class RejectingStorage : IImageStorage
    {
        public int Calls { get; private set; }

        public Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default) => UnexpectedCall<ImageDownloadResult?>();

        public Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default) =>
            UnexpectedCall<ImageUploadResult>();

        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string fileName, ImageStorageContext context, CancellationToken cancellationToken = default) =>
            UnexpectedCall<ImageUploadResult>();

        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default) =>
            UnexpectedCall<bool>();

        private Task<T> UnexpectedCall<T>()
        {
            Calls++;
            throw new InvalidOperationException("Guest requests must not use persistent image storage.");
        }
    }

    private sealed class RecordingPredictor : IPlantDiseasePredictor
    {
        public int Calls { get; private set; }
        public Stream? ReceivedStream { get; private set; }
        public byte[]? ImageBytes { get; private set; }
        public Exception? Error { get; init; }
        public AiPredictionResult Result { get; set; } = new(0, "Ca_chua___Chay_la_som", 0.94f,
            [new(0, "Ca_chua___Chay_la_som", 0.94f), new(4, "Ca_chua___Khoe_manh", 0.06f)]);

        public Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException("PredictionService sends the request stream to the AI adapter.");

        public async Task<AiPredictionResult> PredictAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
        {
            Calls++;
            ReceivedStream = stream;
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, cancellationToken);
            ImageBytes = buffer.ToArray();
            if (Error != null) throw Error;
            return Result;
        }
    }
}
