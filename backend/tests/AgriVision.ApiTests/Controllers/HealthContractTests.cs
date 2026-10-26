using System.Data.Common;
using System.Net;
using AgriVision.ApiTests.Helpers;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public class HealthContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData(200, HttpStatusCode.OK, "Healthy", "Healthy")]
    [InlineData(503, HttpStatusCode.ServiceUnavailable, "Degraded", "Unreachable")]
    [InlineData(0, HttpStatusCode.ServiceUnavailable, "Degraded", "Unreachable")]
    [Trait("ApiCase", "health.dependencies.states")]
    public async Task Dependencies_ReportsHttpAndTransportFailureWithoutChangingDbHealth(int upstreamStatus, HttpStatusCode expected, string status, string aiCheck)
    {
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IHttpClientFactory>();
            services.AddSingleton<IHttpClientFactory>(new HealthClientFactory(upstreamStatus));
        }));
        using var client = app.CreateClient();
        using var response = await client.GetAsync("/api/health/deps");
        response.StatusCode.Should().Be(expected);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        var body = await ApiTestClient.Json(response);
        body.GetProperty("status").GetString().Should().Be(status);
        body.GetProperty("timestamp").GetDateTime().Kind.Should().Be(DateTimeKind.Utc);
        body.GetProperty("checks").GetProperty("aiService").GetString().Should().Be(aiCheck);
        body.ToString().Should().NotContain("synthetic-sensitive-upstream-detail");
        using var database = await client.GetAsync("/api/health");
        database.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    [Trait("ApiCase", "health.database.unavailable")]
    public async Task Database_Unavailable_ReturnsDegradedWithoutExposingConnectionError()
    {
        var gate = new BrokenConnection();
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddDbContext<AppDbContext>((provider, options) => options.AddInterceptors(gate))));
        using var client = app.CreateClient();
        gate.Broken = true;
        using var response = await client.GetAsync("/api/health");
        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("status").GetString().Should().Be("Degraded");
        body.GetProperty("checks").GetProperty("database").GetString().Should().Be("Unhealthy");
        body.ToString().Should().NotContain("synthetic-sensitive-db-detail");
    }

    private sealed class BrokenConnection : DbConnectionInterceptor
    {
        public bool Broken;
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData data, InterceptionResult result, CancellationToken token = default)
        {
            if (Broken) throw new InvalidOperationException("synthetic-sensitive-db-detail");
            return ValueTask.FromResult(result);
        }
    }
    private sealed class HealthClientFactory(int status) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new Handler(status));
    }
    private sealed class Handler(int status) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            request.RequestUri!.AbsolutePath.Should().Be("/health");
            if (status == 0) throw new HttpRequestException("synthetic-sensitive-upstream-detail");
            return Task.FromResult(new HttpResponseMessage((HttpStatusCode)status));
        }
    }
}
