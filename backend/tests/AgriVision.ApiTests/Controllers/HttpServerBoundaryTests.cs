using System.Net;
using System.Net.Http.Headers;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public class HttpServerBoundaryTests
{
    [Fact]
    [Trait("ApiCase", "predictions.server.request_limit")]
    public async Task Kestrel_TotalRequestAbove16MiB_RejectsBeforeInference()
    {
        await using var fixture = new KestrelFactory();
        await fixture.InitializeAsync();
        var predictor = new PredictDouble();
        var storage = new StorageDouble();
        using var app = fixture.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>(); services.AddSingleton<IPlantDiseasePredictor>(predictor);
            services.RemoveAll<IImageStorage>(); services.AddSingleton<IImageStorage>(storage);
        }));
        // Force deferred host startup before reading the dynamically allocated URL.
        using var bootstrap = app.CreateClient();
        using var client = new HttpClient { BaseAddress = fixture.Address, Timeout = TimeSpan.FromSeconds(30) };
        using var form = Image();
        for (var i = 0; i < 17; i++) form.Add(new StringContent(new string('x', 1024 * 1024)), "padding" + i);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/predictions") { Content = form };
        request.Headers.ExpectContinue = true;
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        // MVC form binding surfaces Kestrel's body limit as a 400 ProblemDetails.
        // Assert the server-limit diagnostic, not just any input rejection.
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var diagnostic = await response.Content.ReadAsStringAsync();
        diagnostic.Should().ContainEquivalentOf("request body too large").And.Contain("16777216");
        predictor.Calls.Should().Be(0);
        storage.Uploads.Should().Be(0);
        using var small = Image();
        (await client.PostAsync("/api/predictions", small)).StatusCode.Should().Be(HttpStatusCode.OK);
        predictor.Calls.Should().Be(1);
    }

    [Fact]
    [Trait("ApiCase", "predictions.server.timeout")]
    public async Task Kestrel_Timeout_CancelsInferenceAndReleasesConcurrencyPermit()
    {
        await using var fixture = new KestrelFactory();
        await fixture.InitializeAsync();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var canceled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var started = 0;
        var stopped = 0;
        var predictor = new PredictDouble { Run = async token =>
        {
            if (Interlocked.Increment(ref started) == 8) entered.TrySetResult();
            try { await Task.Delay(Timeout.Infinite, token); }
            catch (OperationCanceledException) { if (Interlocked.Increment(ref stopped) == 8) canceled.TrySetResult(); throw; }
            throw new InvalidOperationException("Unreachable");
        }};
        using var app = fixture.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>(); services.AddSingleton<IPlantDiseasePredictor>(predictor);
            services.Configure<RequestTimeoutOptions>(options => options.AddPolicy("prediction", TimeSpan.FromSeconds(5)));
        }));
        using var bootstrap = app.CreateClient();
        using var client = new HttpClient { BaseAddress = fixture.Address, Timeout = TimeSpan.FromSeconds(30) };
        var forms = Enumerable.Range(0, 8).Select(_ => Image()).ToArray();
        try
        {
            var pending = forms.Select(form => client.PostAsync("/api/predictions", form)).ToArray();
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(20));
            var responses = await Task.WhenAll(pending).WaitAsync(TimeSpan.FromSeconds(30));
            foreach (var response in responses)
            {
                using (response) response.StatusCode.Should().Be(HttpStatusCode.GatewayTimeout);
            }
            await canceled.Task.WaitAsync(TimeSpan.FromSeconds(10));
        }
        finally { foreach (var form in forms) form.Dispose(); }
        var probeEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var probeRelease = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var probeCount = 0;
        predictor.Run = async token =>
        {
            if (Interlocked.Increment(ref probeCount) == 8) probeEntered.TrySetResult();
            await probeRelease.Task.WaitAsync(token);
            return new AiPredictionResult(0, "Ca_chua___Chay_la_som", .94f, [new(0, "Ca_chua___Chay_la_som", .94f)]);
        };
        var probes = Enumerable.Range(0, 8).Select(_ => Image()).ToArray();
        var probing = probes.Select(form => client.PostAsync("/api/predictions", form)).ToArray();
        try { await probeEntered.Task.WaitAsync(TimeSpan.FromSeconds(20)); }
        finally { probeRelease.TrySetResult(); }
        try
        {
            foreach (var response in await Task.WhenAll(probing))
                using (response) response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        finally { foreach (var form in probes) form.Dispose(); }
    }

    private static MultipartFormDataContent Image()
    {
        var form = new MultipartFormDataContent();
        var bytes = new ByteArrayContent([1, 2, 3]); bytes.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(bytes, "file", "leaf.png"); return form;
    }
}
