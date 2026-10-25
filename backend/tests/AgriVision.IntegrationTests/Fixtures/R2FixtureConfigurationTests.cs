using AgriVision.TestSupport;
using Amazon.S3;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.IntegrationTests.Fixtures;

public class R2FixtureConfigurationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Host_UsesOnlyTheStorageConfigurationSelectedByItsFixture(bool realR2)
    {
        const string endpoint = "https://fixture-account.r2.cloudflarestorage.com";
        var configuration = Configuration();
        await using AgriVisionFactory factory = realR2 ? new RealR2Factory(configuration) : new AgriVisionFactory();
        await factory.InitializeAsync();
        using var client = factory.CreateClient();
        var actual = factory.Services.GetRequiredService<IConfiguration>();
        actual["R2:ServiceUrl"].Should().Be(realR2 ? endpoint : "https://test.invalid");
        actual["R2:BucketName"].Should().Be(realR2 ? "agrivision-images-dev" : "test-bucket");
        actual["R2:AccessKeyId"].Should().Be(realR2 ? "fixture-access-key" : "synthetic-key");
        actual["R2:SecretAccessKey"].Should().Be(realR2 ? "fixture-secret-key" : "synthetic-secret");
        if (realR2)
        {
            // Resolve the production SDK registration without making a network request.
            var s3 = factory.Services.GetRequiredService<IAmazonS3>();
            s3.Config.ServiceURL.TrimEnd('/').Should().Be(endpoint);
            s3.Config.Should().BeOfType<AmazonS3Config>().Which.ForcePathStyle.Should().BeTrue();
        }
    }

    [Theory]
    [InlineData("missing-secret")]
    [InlineData("other-bucket")]
    public async Task RealFixture_RejectsMissingCredentialsAndBucketsOutsideDevScope(string scenario)
    {
        var configuration = Configuration();
        if (scenario == "missing-secret") configuration["R2:SecretAccessKey"] = null;
        else configuration["R2:BucketName"] = "unapproved-bucket";
        await using var factory = new RealR2Factory(configuration);
        await factory.InitializeAsync();
        Action start = () => { using var client = factory.CreateClient(); };
        start.Should().Throw<InvalidOperationException>().WithMessage(scenario == "missing-secret"
            ? "Real R2 tests require R2__SecretAccessKey in the test process environment."
            : "Real R2 tests are restricted to agrivision-images-dev.");
    }

    private static IConfiguration Configuration() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["R2:ServiceUrl"] = "https://fixture-account.r2.cloudflarestorage.com",
        ["R2:BucketName"] = "agrivision-images-dev",
        ["R2:AccessKeyId"] = "fixture-access-key",
        ["R2:SecretAccessKey"] = "fixture-secret-key"
    }).Build();
}
