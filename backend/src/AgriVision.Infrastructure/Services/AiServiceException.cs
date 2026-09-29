using System.Net;

namespace AgriVision.Infrastructure.Services;

public sealed class AiServiceException : Exception
{
    public HttpStatusCode StatusCode { get; }

    public AiServiceException(string message, HttpStatusCode statusCode, Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
