using System.Net;
using System.Net.Http.Headers;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public class ErrorContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Fact]
    [Trait("ApiCase", "predictions.unexpected_error_redaction")]
    public async Task UnexpectedFailure_ReturnsServerErrorWithoutInternalMessage()
    {
        var predictor = new PredictDouble { Run = _ => throw new Exception("synthetic-sensitive-connection-secret") };
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(predictor);
        }));
        using var client = app.CreateClient();
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent([1, 2, 3]); content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(content, "file", "leaf.png");
        using var response = await client.PostAsync("/api/predictions", form);
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("statusCode").GetInt32().Should().Be(500);
        body.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace().And.NotContain("synthetic-sensitive-connection-secret");
    }
}
