using System.Net;
using System.Net.Http.Headers;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.ApiTests.Controllers;

public class CatalogImagesTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=");

    private static MultipartFormDataContent FileBody(byte[] bytes, string contentType = "image/png")
    {
        var body = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        body.Add(file, "file", "catalog.png");
        return body;
    }

    private static async Task<Guid> AddRecord(IServiceProvider services, string kind)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.NewGuid();
        if (kind == "plants") db.Plants.Add(new Plant { Id = id, Name = $"Image_{id:N}" });
        else db.Diseases.Add(new Disease { Id = id, Name = $"Image_{id:N}" });
        await db.SaveChangesAsync();
        return id;
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.images.validation")]
    public async Task InvalidFiles_DoNotUploadOrReplaceTheSavedImage(string kind)
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        using var admin = host.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var id = await AddRecord(host.Services, kind);
        var path = $"/api/catalog/{kind}/{id:D}/image";
        using var original = FileBody(Png);
        using var created = await admin.PutAsync(path, original);
        created.StatusCode.Should().Be(HttpStatusCode.OK);
        var originalUrl = (await ApiTestClient.Json(created)).GetProperty("imageUrl").GetString();
        var originalKey = storage.Objects.Keys.Single();

        (byte[] Bytes, string Mime)[] invalidFiles =
        [
            ([], "image/png"),
            ([1, 2, 3], "image/png"),
            (Png, "image/jpeg"),
            (Png, "image/svg+xml"),
            (new byte[5 * 1024 * 1024 + 1], "image/png")
        ];
        foreach (var (bytes, mime) in invalidFiles)
        {
            using var body = FileBody(bytes, mime);
            using var response = await admin.PutAsync(path, body);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest, $"reject {bytes.Length} bytes declared as {mime}");
        }

        storage.Uploads.Should().Be(1);
        storage.Objects.Keys.Should().Equal(originalKey);
        using var detail = await admin.GetAsync($"/api/{kind}/{id:D}");
        (await ApiTestClient.Json(detail)).GetProperty("imageUrl").GetString().Should().Be(originalUrl);
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.PendingImageUploads.AnyAsync(p => p.Key.Contains($"/catalog/{kind}/{id:D}/"))).Should().BeFalse();
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.images.size-boundary")]
    public async Task FileAtFiveMiB_IsAcceptedAndReturnedWithoutTruncation(string kind)
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        using var admin = host.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var id = await AddRecord(host.Services, kind);
        // Padding exercises the file-size contract; image decoding is not part of this API's validation.
        var bytes = new byte[5 * 1024 * 1024];
        Png.CopyTo(bytes, 0);
        using var body = FileBody(bytes);
        using var uploaded = await admin.PutAsync($"/api/catalog/{kind}/{id:D}/image", body);
        uploaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var url = (await ApiTestClient.Json(uploaded)).GetProperty("imageUrl").GetString();
        using var guest = host.CreateClient();
        using var downloaded = await guest.GetAsync(url);
        downloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        (await downloaded.Content.ReadAsByteArrayAsync()).Should().Equal(bytes);
        storage.Uploads.Should().Be(1);
    }

    [Theory]
    [InlineData("plants", HttpStatusCode.NotFound)]
    [InlineData("diseases", HttpStatusCode.NotFound)]
    [InlineData("medicines", HttpStatusCode.BadRequest)]
    [Trait("ApiCase", "catalog.images.missing-record")]
    public async Task MissingRecordOrUnsupportedKind_RejectsReadsAndWritesWithoutStorageUpload(string kind, HttpStatusCode expected)
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        using var admin = host.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var path = $"/api/catalog/{kind}/{Guid.NewGuid():D}/image";
        using var body = FileBody(Png);
        using var uploaded = await admin.PutAsync(path, body);
        using var removed = await admin.DeleteAsync(path);
        using var read = await admin.GetAsync(path);
        uploaded.StatusCode.Should().Be(expected);
        removed.StatusCode.Should().Be(expected);
        read.StatusCode.Should().Be(expected);
        storage.Uploads.Should().Be(0);
        storage.Objects.Should().BeEmpty();
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.images.lifecycle")]
    public async Task Images_RequireAdmin_PersistAndReplace_KeepOldOnFailure_AndHideInactiveCatalog(string kind)
    {
        var storage = new StorageDouble();
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        using var admin = host.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var guest = host.CreateClient();
        using var user = host.CreateClient();
        await ApiTestClient.Register(user);
        var id = await AddRecord(host.Services, kind);
        var path = $"/api/catalog/{kind}/{id:D}/image";
        (await guest.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        using (var body = FileBody(Png)) (await guest.PutAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await guest.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using (var body = FileBody(Png)) (await user.PutAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await user.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using (var body = FileBody([1, 2, 3])) (await admin.PutAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        storage.Uploads.Should().Be(0);
        using var initialBody = FileBody(Png);
        using var uploaded = await admin.PutAsync(path, initialBody);
        uploaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstUrl = (await ApiTestClient.Json(uploaded)).GetProperty("imageUrl").GetString()!;
        using var detail = await guest.GetAsync($"/api/{kind}/{id}");
        (await ApiTestClient.Json(detail)).GetProperty("imageUrl").GetString().Should().Be(firstUrl);
        using var image = await guest.GetAsync(firstUrl);
        image.StatusCode.Should().Be(HttpStatusCode.OK);
        (await image.Content.ReadAsByteArrayAsync()).Should().Equal(Png);
        image.Headers.CacheControl!.NoStore.Should().BeTrue();
        image.Headers.GetValues("X-Content-Type-Options").Should().ContainSingle().Which.Should().Be("nosniff");
        image.Content.Headers.ContentType!.MediaType.Should().Be("image/png");

        storage.Missing = true;
        (await guest.GetAsync(firstUrl)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        storage.Missing = false;
        (await guest.GetAsync(firstUrl)).StatusCode.Should().Be(HttpStatusCode.OK);

        storage.FailUpload = true;
        using (var body = FileBody(Png)) (await admin.PutAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        storage.FailUpload = false;
        using var retained = await guest.GetAsync($"/api/{kind}/{id}");
        (await ApiTestClient.Json(retained)).GetProperty("imageUrl").GetString().Should().Be(firstUrl);
        storage.Objects.Should().ContainSingle();

        using var replacementBody = FileBody(Png);
        using var replaced = await admin.PutAsync(path, replacementBody);
        replaced.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(replaced)).GetProperty("imageUrl").GetString().Should().NotBe(firstUrl);
        storage.Objects.Should().ContainSingle();
        (await admin.DeleteAsync($"/api/{kind}/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await guest.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
        await using (var scope = host.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (kind == "plants") await db.Plants.Where(p => p.Id == id).ExecuteUpdateAsync(u => u.SetProperty(p => p.IsActive, true));
            else await db.Diseases.Where(d => d.Id == id).ExecuteUpdateAsync(u => u.SetProperty(d => d.IsActive, true));
        }
        (await guest.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var withoutImage = await guest.GetAsync($"/api/{kind}/{id}");
        withoutImage.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(withoutImage)).GetProperty("imageUrl").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        storage.Objects.Should().BeEmpty();
        await using var finalScope = host.Services.CreateAsyncScope();
        var finalDb = finalScope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await finalDb.PendingImageUploads.AnyAsync(p => p.Key.Contains($"/catalog/{kind}/{id:D}/"))).Should().BeFalse();
    }
}
