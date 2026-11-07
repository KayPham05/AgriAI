namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IAccountEmailSender
{
    Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken);
}
