using System.Net;
using System.Net.Mail;
using AgriVision.Application.Common.Interfaces.Authentication;
using Microsoft.Extensions.Configuration;

namespace AgriVision.Infrastructure.Authentication;

public sealed class SmtpAccountEmailSender(IConfiguration configuration) : IAccountEmailSender
{
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken)
    {
        var settings = configuration.GetSection("Smtp");
        var host = settings["Host"];
        if (string.IsNullOrWhiteSpace(host))
            throw new InvalidOperationException("SMTP is not configured.");

        var sender = settings["Sender"] ?? throw new InvalidOperationException("Smtp:Sender is required.");
        var password = settings["Password"] ?? throw new InvalidOperationException("Smtp:Password is required.");
        using var message = new MailMessage(sender, recipient, subject, body);
        using var client = new SmtpClient(host, settings.GetValue("Port", 587))
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(sender, password)
        };
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(settings.GetValue("TimeoutSeconds", 30)));
        await client.SendMailAsync(message, timeout.Token);
    }
}
