using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriVision.API.Middleware;

public static class StorageTrafficLimits
{
    public static void AddStorageTrafficLimits(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddRequestTimeouts(options => options.AddPolicy("prediction", TimeSpan.FromMinutes(2)));
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                (context.Request.Path.StartsWithSegments("/api/predictions") || context.Request.Path.StartsWithSegments("/api/auth"))
                    ? RateLimitPartition.GetConcurrencyLimiter("predictions", _ => new ConcurrencyLimiterOptions
                    { PermitLimit = 8, QueueLimit = 0 })
                    : RateLimitPartition.GetNoLimiter("other"));
            AddPolicy("prediction", "PredictionRequestsPerMinute", 10);
            AddPolicy("image", "ImageRequestsPerMinute", 60);
            AddPolicy("auth", "AuthRequestsPerMinute", 10);
            options.OnRejected = async (context, token) =>
            {
                var seconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
                    ? Math.Max(1, (int)Math.Ceiling(retry.TotalSeconds)) : 1;
                context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many requests. Please try again later." }, token);
            };

            void AddPolicy(string name, string setting, int defaultLimit)
            {
                var limit = configuration.GetValue($"TrafficLimits:{setting}", defaultLimit);
                if (limit < 1) throw new InvalidOperationException("Traffic limits must be positive.");
                options.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(
                    name == "auth" ? context.Connection.RemoteIpAddress?.ToString() ?? "unknown" :
                        context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    { PermitLimit = limit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
            }
        });
    }
}
