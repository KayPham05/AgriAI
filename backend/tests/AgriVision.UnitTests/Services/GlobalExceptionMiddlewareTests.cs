using System.Net;
using System.Text.Json;
using AgriVision.API.Middleware;
using AgriVision.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriVision.UnitTests.Services;

public class GlobalExceptionMiddlewareTests
{
    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.BadGateway)]
    public async Task InvokeAsync_ShouldExposeClearAiError(HttpStatusCode statusCode)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new AiServiceException("AI service cannot process this image.", statusCode),
            NullLogger<GlobalExceptionMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be((int)statusCode);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("message").GetString().Should().Be("AI service cannot process this image.");
    }
}
