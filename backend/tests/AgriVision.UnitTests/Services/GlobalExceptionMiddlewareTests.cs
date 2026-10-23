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
    [InlineData("ix_plants_name", 400)]
    [InlineData("ix_diseases_name", 400)]
    [InlineData("other_unique_constraint", 500)]
    public async Task UniquePlantName_ReturnsSafeValidationErrorWithoutMaskingOtherConstraints(string constraint, int status)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var databaseError = new Npgsql.PostgresException("synthetic-sensitive-database-detail", "ERROR", "ERROR", "23505", constraintName: constraint);
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new Microsoft.EntityFrameworkCore.DbUpdateException("synthetic-sensitive-update-detail", databaseError), NullLogger<GlobalExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context);
        context.Response.StatusCode.Should().Be(status);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace().And.NotContain("synthetic-sensitive");
    }

    [Fact]
    public async Task UnexpectedFailure_RedactsInternalExceptionMessage()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new Exception("synthetic-sensitive-connection-secret"), NullLogger<GlobalExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context);
        context.Response.StatusCode.Should().Be(500);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace().And.NotContain("synthetic-sensitive-connection-secret");
    }

    [Fact]
    public async Task StorageFailure_ReturnsServiceUnavailable()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new ImageStorageException("Image storage is unavailable. Please try again."),
            NullLogger<GlobalExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context);
        context.Response.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("message").GetString().Should().Be("Image storage is unavailable. Please try again.");
    }

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
