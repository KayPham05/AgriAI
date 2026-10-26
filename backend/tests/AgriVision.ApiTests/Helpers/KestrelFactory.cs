using AgriVision.TestSupport;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AgriVision.ApiTests.Helpers;

// .NET 9 WebApplicationFactory requires TestServer for its own client. Keep that
// host for compatibility and expose a separately owned real Kestrel host.
internal sealed class KestrelFactory : AgriVisionFactory
{
    private IHost? _realHost;
    public Uri Address { get; private set; } = null!;
    protected override IHost CreateHost(IHostBuilder builder)
    {
        var testHost = builder.Build();
        builder.ConfigureWebHost(web => web.UseKestrel().UseUrls("http://127.0.0.1:0"));
        _realHost = builder.Build();
        _realHost.Start();
        Address = new Uri(_realHost.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single());
        testHost.Start();
        return testHost;
    }
    public override async Task DisposeAsync()
    {
        try
        {
            if (_realHost != null)
            {
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                try { await _realHost.StopAsync(timeout.Token); }
                finally { _realHost.Dispose(); _realHost = null; }
            }
        }
        finally { await base.DisposeAsync(); }
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing) _realHost?.Dispose();
        base.Dispose(disposing);
    }
}
