using AgriVision.TestSupport;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace AgriVision.IntegrationTests.Fixtures;

public class RealR2Factory : AgriVisionFactory
{
    private readonly IConfiguration _configuration;

    public RealR2Factory() : this(new ConfigurationBuilder().AddEnvironmentVariables().Build()) { }

    internal RealR2Factory(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    protected override void ConfigureR2(IWebHostBuilder builder)
    {
        foreach (var name in new[] { "ServiceUrl", "BucketName", "AccessKeyId", "SecretAccessKey" })
        {
            var value = _configuration[$"R2:{name}"];
            if (string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException($"Real R2 tests require R2__{name} in the test process environment.");
            builder.UseSetting($"R2:{name}", value);
        }
        if (_configuration["R2:BucketName"] != "agrivision-images-dev")
            throw new InvalidOperationException("Real R2 tests are restricted to agrivision-images-dev.");
    }
}
