using AgriVision.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public HealthController(
        AppDbContext dbContext,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> CheckHealth(CancellationToken cancellationToken)
    {
        var isDbConnected = false;
        try
        {
            isDbConnected = await _dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            isDbConnected = false;
        }

        var healthResponse = new
        {
            Status = isDbConnected ? "Healthy" : "Degraded",
            Timestamp = DateTime.UtcNow,
            Checks = new { Database = isDbConnected ? "Healthy" : "Unhealthy" }
        };
        return isDbConnected ? Ok(healthResponse) : StatusCode(503, healthResponse);
    }

    [HttpGet("deps")]
    public async Task<IActionResult> CheckDependencies(CancellationToken cancellationToken)
    {
        var isAiServiceHealthy = false;
        var aiBaseUrl = _configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);
            using var response = await client.GetAsync($"{aiBaseUrl.TrimEnd('/')}/health", cancellationToken);
            isAiServiceHealthy = response.IsSuccessStatusCode;
        }
        catch
        {
            isAiServiceHealthy = false;
        }

        var status = isAiServiceHealthy ? "Healthy" : "Degraded";

        var healthResponse = new
        {
            Status = status,
            Timestamp = DateTime.UtcNow,
            Checks = new
            {
                AiService = isAiServiceHealthy ? "Healthy" : "Unreachable"
            }
        };
        return status == "Healthy" ? Ok(healthResponse) : StatusCode(503, healthResponse);
    }
}
