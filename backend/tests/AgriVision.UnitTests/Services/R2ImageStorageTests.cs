using System.Net;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Infrastructure;
using AgriVision.Infrastructure.Services;
using Amazon.S3;
using Amazon.S3.Model;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace AgriVision.UnitTests.Services;

public class R2ImageStorageTests
{
    private readonly Mock<IAmazonS3> _client = new();
    private readonly IConfiguration _configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["R2:BucketName"] = "test-images"
    }).Build();

    [Fact]
    public async Task Upload_PreservesBytesAndContentType_WithoutReturningPublicUrl()
    {
        byte[]? uploaded = null;
        PutObjectRequest? sent = null;
        _client.Setup(client => client.PutObjectAsync(It.IsAny<PutObjectRequest>(), It.IsAny<CancellationToken>()))
            .Returns(async (PutObjectRequest request, CancellationToken token) =>
            {
                sent = request;
                using var buffer = new MemoryStream();
                await request.InputStream.CopyToAsync(buffer, token);
                uploaded = buffer.ToArray();
                return new PutObjectResponse { HttpStatusCode = HttpStatusCode.OK };
            });
        var storage = new R2ImageStorage(_client.Object, _configuration);
        using var stream = new MemoryStream([1, 2, 3]);
        var context = new ImageStorageContext(Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Guid.Parse("22222222-2222-2222-2222-222222222222"), Guid.Parse("33333333-3333-3333-3333-333333333333"));
        var result = await storage.UploadImageAsync(stream, "../../leaf.PNG", context);
        uploaded.Should().Equal(1, 2, 3);
        sent!.BucketName.Should().Be("test-images");
        sent.ContentType.Should().Be("image/png");
        sent.Key.Should().MatchRegex("^users/[a-f0-9-]{36}/predictions/[a-f0-9-]{36}/[a-f0-9-]{36}\\.png$");
        sent.Key.Should().Be("users/11111111-1111-1111-1111-111111111111/predictions/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.png");
        sent.Key.Should().Be(result.PublicId);
        sent.DisablePayloadSigning.Should().BeTrue();
        sent.DisableDefaultChecksumValidation.Should().BeTrue();
        result.SecureUrl.Should().BeEmpty();
        stream.CanRead.Should().BeTrue();
    }

    [Fact]
    public async Task Read_ReturnsBytes_AndMissingObjectReturnsNull()
    {
        _client.Setup(client => client.GetObjectAsync(It.IsAny<GetObjectRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GetObjectResponse { ResponseStream = new MemoryStream([7, 8]), HttpStatusCode = HttpStatusCode.OK });
        var storage = new R2ImageStorage(_client.Object, _configuration);
        var image = await storage.ReadImageAsync("r2/predictions/leaf.png");
        image!.Content.Should().Equal(7, 8);
        image.ContentType.Should().Be("image/png");
        _client.Setup(client => client.GetObjectAsync(It.IsAny<GetObjectRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonS3Exception("missing") { StatusCode = HttpStatusCode.NotFound });
        (await storage.ReadImageAsync("r2/predictions/missing.png")).Should().BeNull();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Read_RejectsOversizedObjects_BeforeExceedingBufferLimit(bool hasContentLength)
    {
        _client.Setup(client => client.GetObjectAsync(It.IsAny<GetObjectRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GetObjectResponse { ContentLength = hasContentLength ? 15L * 1024 * 1024 + 1 : 0, ResponseStream = new MemoryStream(hasContentLength ? [1] : new byte[15 * 1024 * 1024 + 1]) });
        var storage = new R2ImageStorage(_client.Object, _configuration);
        await FluentActions.Invoking(() => storage.ReadImageAsync("r2/predictions/leaf.png")).Should().ThrowAsync<ImageStorageException>();
    }

    [Fact]
    public async Task StorageFailure_IsSanitized_AndDoesNotReturnALocalFallback()
    {
        _client.Setup(client => client.PutObjectAsync(It.IsAny<PutObjectRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonS3Exception("provider diagnostic that must stay private") { StatusCode = HttpStatusCode.Forbidden });
        var storage = new R2ImageStorage(_client.Object, _configuration);
        using var stream = new MemoryStream([1]);
        var act = () => storage.UploadImageAsync(stream, "leaf.jpg", new ImageStorageContext(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()));
        var error = await act.Should().ThrowAsync<ImageStorageException>();
        error.Which.Message.Should().NotContain("provider diagnostic");
        error.Which.InnerException.Should().BeNull();
    }

    [Theory]
    [InlineData("local_leaf.png")]
    [InlineData("agrivision/old-cloud-object")]
    [InlineData("r2/predictions/../other.png")]
    public async Task Delete_RejectsLegacyAndUnsafeKeys(string key)
    {
        var storage = new R2ImageStorage(_client.Object, _configuration);
        await FluentActions.Invoking(() => storage.DeleteImageAsync(key)).Should().ThrowAsync<ImageStorageException>();
        _client.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Delete_IsIdempotent_ButDoesNotHideProviderFailure()
    {
        var storage = new R2ImageStorage(_client.Object, _configuration);
        _client.Setup(client => client.DeleteObjectAsync(It.IsAny<DeleteObjectRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonS3Exception("missing") { StatusCode = HttpStatusCode.NotFound });
        (await storage.DeleteImageAsync("r2/predictions/leaf.png")).Should().BeTrue();
        _client.Setup(client => client.DeleteObjectAsync(It.IsAny<DeleteObjectRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonS3Exception("unavailable") { StatusCode = HttpStatusCode.ServiceUnavailable });
        await FluentActions.Invoking(() => storage.DeleteImageAsync("r2/predictions/leaf.png")).Should().ThrowAsync<ImageStorageException>();
    }

    [Fact]
    public void MissingConfiguration_FailsWithoutUsingCloudinaryOrLocalStorage()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unused" }).Build();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddInfrastructureServices(configuration);
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        FluentActions.Invoking(() => scope.ServiceProvider.GetRequiredService<IImageStorage>())
            .Should().Throw<ImageStorageException>();
    }
}
