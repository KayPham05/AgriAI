using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using System.Text;
using AgriVision.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;

namespace AgriVision.UnitTests.Services;

public class SmtpAccountEmailSenderTests
{
    [Fact]
    public async Task SendAsync_ShouldWaitForSlowServerAndStillRequireStartTls()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var server = RespondWithoutTlsAsync(listener, deadline.Token);
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Smtp:Host"] = "127.0.0.1",
            ["Smtp:Port"] = port.ToString(),
            ["Smtp:Sender"] = "sender@example.com",
            ["Smtp:Password"] = "synthetic-password"
        }).Build();
        var sender = new SmtpAccountEmailSender(configuration);

        // A slow EHLO must reach the TLS requirement instead of the old five-second cancellation.
        await Assert.ThrowsAsync<SmtpException>(() => sender.SendAsync(
            "recipient@example.com", "Synthetic test", "No external email", deadline.Token));
        await server;
    }

    private static async Task RespondWithoutTlsAsync(TcpListener listener, CancellationToken cancellationToken)
    {
        using var connection = await listener.AcceptTcpClientAsync(cancellationToken);
        await using var stream = connection.GetStream();
        using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
        await using var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true)
        {
            NewLine = "\r\n",
            AutoFlush = true
        };
        await writer.WriteLineAsync("220 localhost SMTP test");
        Assert.StartsWith("EHLO ", await reader.ReadLineAsync(cancellationToken));
        await Task.Delay(TimeSpan.FromSeconds(6), cancellationToken);
        await writer.WriteLineAsync("250 localhost");
    }
}
