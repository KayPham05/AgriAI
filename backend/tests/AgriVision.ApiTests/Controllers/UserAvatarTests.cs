using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.ApiTests.Controllers;

public class UserAvatarTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=");

    private static MultipartFormDataContent FileBody(byte[] bytes, string type = "image/png")
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        form.Add(file, "file", "avatar.png");
        return form;
    }

    [Fact]
    [Trait("ApiCase", "user.avatar.lifecycle")]
    public async Task Avatar_PersistsIdentity_IsPrivate_AndReplacesPreviousImage()
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services => {
            services.RemoveAll<IImageStorage>(); services.AddSingleton<IImageStorage>(storage);
        }));
        using var owner = host.CreateClient();
        var ownerAccount = await ApiTestClient.Register(owner);
        using var body = FileBody(Png);
        using var upload = await owner.PostAsync("/api/users/avatar", body);
        upload.StatusCode.Should().Be(HttpStatusCode.OK);
        var first = (await ApiTestClient.Json(upload)).GetProperty("avatarUrl").GetString()!;
        first.Should().StartWith("/api/users/avatar/users/");
        using var profile = await owner.GetAsync("/api/users/profile");
        (await ApiTestClient.Json(profile)).GetProperty("avatarUrl").GetString().Should().Be(first);
        using var me = await owner.GetAsync("/api/auth/me");
        (await ApiTestClient.Json(me)).GetProperty("avatarUrl").GetString().Should().Be(first);
        using var read = await owner.GetAsync(first);
        read.StatusCode.Should().Be(HttpStatusCode.OK);
        (await read.Content.ReadAsByteArrayAsync()).Should().Equal(Png);
        read.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
        read.Headers.CacheControl!.NoStore.Should().BeTrue();
        read.Headers.GetValues("X-Content-Type-Options").Should().ContainSingle("nosniff");
        using var stranger = host.CreateClient();
        await ApiTestClient.Register(stranger);
        using var foreignRead = await stranger.GetAsync(first);
        foreignRead.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var guest = host.CreateClient();
        using var guestRead = await guest.GetAsync(first);
        guestRead.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var guestBody = FileBody(Png);
        using var guestUpload = await guest.PostAsync("/api/users/avatar", guestBody);
        guestUpload.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var replacement = FileBody(Png);
        using var second = await owner.PostAsync("/api/users/avatar", replacement);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        var latest = (await ApiTestClient.Json(second)).GetProperty("avatarUrl").GetString();
        latest.Should().NotBe(first);
        storage.Objects.Should().ContainSingle();
        using var old = await owner.GetAsync(first);
        old.StatusCode.Should().Be(HttpStatusCode.NotFound);
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.PendingImageUploads.CountAsync(item => item.UserId == ownerAccount.User.Id)).Should().Be(0);
    }

    [Theory]
    [InlineData("empty")]
    [InlineData("disguised")]
    [InlineData("oversized")]
    [InlineData("mime")]
    [Trait("ApiCase", "user.avatar.validation")]
    public async Task Avatar_RejectsInvalidUpload_WithoutChangingProfile(string kind)
    {
        using var owner = factory.CreateClient();
        await ApiTestClient.Register(owner);
        var bytes = kind switch { "empty" => [], "disguised" => new byte[] { 60, 104, 116, 109, 108, 62 }, "oversized" => new byte[15 * 1024 * 1024 + 1], _ => Png };
        using var body = FileBody(bytes, kind == "mime" ? "image/svg+xml" : "image/png");
        using var result = await owner.PostAsync("/api/users/avatar", body);
        result.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.RequestEntityTooLarge);
        using var profile = await owner.GetAsync("/api/users/profile");
        (await ApiTestClient.Json(profile)).GetProperty("avatarUrl").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    [Trait("ApiCase", "user.avatar.storage_failure")]
    public async Task Avatar_StorageFailurePreservesPreviousAvatar_AndCanRetry()
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services => {
            services.RemoveAll<IImageStorage>(); services.AddSingleton<IImageStorage>(storage);
        }));
        using var client = host.CreateClient();
        await ApiTestClient.Register(client);
        using var body = FileBody(Png);
        using var first = await client.PostAsync("/api/users/avatar", body);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var before = (await ApiTestClient.Json(first)).GetProperty("avatarUrl").GetString();
        storage.FailUpload = true;
        using var failedBody = FileBody(Png);
        using var failed = await client.PostAsync("/api/users/avatar", failedBody);
        failed.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        using var current = await client.GetAsync("/api/users/profile");
        (await ApiTestClient.Json(current)).GetProperty("avatarUrl").GetString().Should().Be(before);
        storage.FailUpload = false;
        using var retryBody = FileBody(Png);
        using var retry = await client.PostAsync("/api/users/avatar", retryBody);
        retry.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(retry)).GetProperty("avatarUrl").GetString().Should().NotBe(before);
    }
}
