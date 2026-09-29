using System.Net;
using System.Text;
using AgriVision.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriVision.UnitTests.Services;

public class FastApiPlantDiseasePredictorTests
{
    [Fact]
    public async Task PredictAsync_ShouldReturnServiceUnavailable_WhenAiTimesOut()
    {
        var predictor = CreatePredictor((_, _) => throw new TaskCanceledException("Request timed out"));

        var act = () => predictor.PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        var error = await act.Should().ThrowAsync<AiServiceException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        error.Which.Message.Should().Contain("timed out");
    }

    [Fact]
    public async Task PredictAsync_ShouldReturnServiceUnavailable_WhenAiReturnsHttpError()
    {
        var predictor = CreatePredictor((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)));

        var act = () => predictor.PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        var error = await act.Should().ThrowAsync<AiServiceException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        error.Which.Message.Should().Contain("unavailable");
    }

    [Theory]
    [InlineData("not-json")]
    [InlineData("{}")]
    [InlineData("{\"class_index\":1,\"class_name\":\"Tomato___Early_blight\",\"confidence\":1.5,\"top_k\":[]}")]
    public async Task PredictAsync_ShouldRejectInvalidAiResponse(string body)
    {
        var predictor = CreatePredictor((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        }));

        var act = () => predictor.PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        var error = await act.Should().ThrowAsync<AiServiceException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.BadGateway);
        error.Which.Message.Should().Contain("invalid response");
    }

    [Fact]
    public async Task PredictAsync_ShouldReturnAiResult_WhenResponseIsValid()
    {
        const string body = """
            {"class_index":1,"class_name":"Tomato___Early_blight","confidence":0.94,
             "top_k":[{"class_index":1,"class_name":"Tomato___Early_blight","confidence":0.94}]}
            """;
        var predictor = CreatePredictor((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        }));

        var result = await predictor.PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        result.ClassIndex.Should().Be(1);
        result.ClassName.Should().Be("Tomato___Early_blight");
        result.Confidence.Should().BeApproximately(0.94f, 0.0001f);
        result.TopK.Should().ContainSingle(item => item.ClassIndex == 1);
    }

    private static FastApiPlantDiseasePredictor CreatePredictor(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond)
    {
        var client = new HttpClient(new StubHandler(respond));
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AiService:BaseUrl"] = "http://ai.test"
        }).Build();
        return new FastApiPlantDiseasePredictor(client, configuration, NullLogger<FastApiPlantDiseasePredictor>.Instance);
    }

    private sealed class StubHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            respond(request, cancellationToken);
    }
}
