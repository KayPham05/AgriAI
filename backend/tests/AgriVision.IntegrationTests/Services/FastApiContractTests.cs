using System.Net;
using AgriVision.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriVision.IntegrationTests.Services;

public class FastApiContractTests
{
    [Fact]
    public async Task PredictAsync_ShouldSendMultipartFile_AndParseResponse()
    {
        await using var stub = CreateStub();
        string? receivedName = null;
        byte[]? receivedBytes = null;
        stub.MapPost("/predict", async (HttpRequest request) =>
        {
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file")!;
            receivedName = file.FileName;
            using var bytes = new MemoryStream();
            await file.CopyToAsync(bytes);
            receivedBytes = bytes.ToArray();
            return Results.Json(new
            {
                class_index = 1, class_name = "Tomato___Early_blight", confidence = 0.94,
                top_k = new[] { new { class_index = 1, class_name = "Tomato___Early_blight", confidence = 0.94 } }
            });
        });
        await stub.StartAsync();
        using var client = new HttpClient();

        var result = await CreatePredictor(stub, client).PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        receivedName.Should().Be("leaf.jpg");
        receivedBytes.Should().Equal(1, 2, 3);
        result.ClassIndex.Should().Be(1);
        result.ClassName.Should().Be("Tomato___Early_blight");
        result.Confidence.Should().BeApproximately(0.94f, 0.0001f);
        result.TopK.Should().ContainSingle(item => item.ClassIndex == 1);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PredictAsync_ShouldReturn503_WhenHttpServiceFails(bool timeout)
    {
        await using var stub = CreateStub();
        stub.MapPost("/predict", async (HttpContext context) =>
        {
            if (timeout)
                await Task.Delay(TimeSpan.FromSeconds(5), context.RequestAborted);
            return Results.StatusCode(500);
        });
        await stub.StartAsync();
        using var client = new HttpClient
        {
            Timeout = timeout ? TimeSpan.FromMilliseconds(300) : TimeSpan.FromSeconds(10)
        };

        var act = () => CreatePredictor(stub, client).PredictAsync(new MemoryStream([1, 2, 3]), "leaf.jpg");

        var error = await act.Should().ThrowAsync<AiServiceException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        error.Which.Message.Should().Contain(timeout ? "timed out" : "unavailable");
    }

    private static WebApplication CreateStub()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        return builder.Build();
    }

    private static FastApiPlantDiseasePredictor CreatePredictor(WebApplication stub, HttpClient client)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AiService:BaseUrl"] = stub.Urls.Single()
        }).Build();
        return new FastApiPlantDiseasePredictor(client, configuration, NullLogger<FastApiPlantDiseasePredictor>.Instance);
    }
}
