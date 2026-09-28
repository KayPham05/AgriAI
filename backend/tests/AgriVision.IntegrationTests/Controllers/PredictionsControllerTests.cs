using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
        result.PredictedPlantDisease.ClassName.Should().Be("Tomato___Early_blight");
        result.PredictedPlantDisease.Plant.Name.Should().Be("Tomato");
        result.PredictedPlantDisease.Disease.Name.Should().Be("Early Blight");
        result.PredictionDetails.Should().HaveCount(2);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedPrediction = await dbContext.Predictions
            .Include(prediction => prediction.PredictionDetails)
            .SingleAsync(prediction => prediction.Id == result.Id);

        persistedPrediction.Confidence.Should().BeApproximately(0.94, 0.0001);
        persistedPrediction.PredictionDetails.Should().HaveCount(2);
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

    private static MultipartFormDataContent CreateImageRequest(string fileName, string contentType)
    {
        var imageContent = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x01]);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var request = new MultipartFormDataContent();
        request.Add(imageContent, "file", fileName);
        return request;
    }
}
