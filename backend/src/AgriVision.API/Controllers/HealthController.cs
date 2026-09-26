using AgriVision.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.API.Controllers;

[ApiController]
[Route("[controller]")]
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

        var isAiServiceHealthy = false;
        var aiBaseUrl = _configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);
            var response = await client.GetAsync($"{aiBaseUrl}/health", cancellationToken);
            isAiServiceHealthy = response.IsSuccessStatusCode;
        }
        catch
        {
            isAiServiceHealthy = false;
        }

        var status = (isDbConnected && isAiServiceHealthy) ? "Healthy" : "Degraded";

        return Ok(new
        {
            Status = status,
            Timestamp = DateTime.UtcNow,
            Checks = new
            {
                Database = isDbConnected ? "Healthy" : "Unhealthy",
                AiService = isAiServiceHealthy ? "Healthy" : "Unreachable"
            }
        });
    }
}
