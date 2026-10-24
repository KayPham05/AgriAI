using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class CatalogContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("plants", "vietnameseName", 150)]
    [InlineData("plants", "scientificName", 200)]
    [InlineData("diseases", "vietnameseName", 200)]
    [Trait("ApiCase", "catalog.optional_field_boundaries")]
    public async Task OptionalField_AtLimitAccepted_OverLimitRejectedWithoutMutation(string resource, string field, int max)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Admin(client, factory);
        var name = "Optional_" + Guid.NewGuid().ToString("N");
        var payload = new Dictionary<string, object?> { ["name"] = name, [field] = new string('a', max), ["isActive"] = true };
        using var create = await client.PostAsJsonAsync("/api/" + resource, payload);
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await ApiTestClient.Json(create)).GetProperty("id").GetGuid();
        payload[field] = new string('b', max + 1);
        using var update = await client.PutAsJsonAsync($"/api/{resource}/{id}", payload);
        update.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var detail = await client.GetAsync($"/api/{resource}/{id}");
        (await ApiTestClient.Json(detail)).GetProperty(field).GetString().Should().Be(new string('a', max));
        payload["name"] = "Over_" + Guid.NewGuid().ToString("N");
        using var invalidCreate = await client.PostAsJsonAsync("/api/" + resource, payload);
        invalidCreate.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.create_and_read")]
    public async Task Create_ReturnsLocationAndPublicReadableContract(string resource)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var name = $"contract-{Guid.NewGuid():N}";
        using var created = await admin.PostAsJsonAsync($"/api/{resource}", Body(name));
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        created.Headers.Location.Should().NotBeNull();
        created.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        var body = await ApiTestClient.Json(created);
        body.GetProperty("id").GetGuid().Should().NotBeEmpty();
        body.GetProperty("name").GetString().Should().Be(name);
        body.GetProperty("vietnameseName").GetString().Should().Be("Tên thử");
        body.GetProperty("description").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("isActive").GetBoolean().Should().BeTrue();
        body.GetProperty("createdAt").GetDateTime().Should().BeAfter(DateTime.UtcNow.AddMinutes(-5));
        if (resource == "plants")
            body.GetProperty("scientificName").ValueKind.Should().Be(JsonValueKind.Null);
        else
        {
            body.GetProperty("symptoms").ValueKind.Should().Be(JsonValueKind.Null);
            body.GetProperty("treatment").ValueKind.Should().Be(JsonValueKind.Null);
            body.GetProperty("prevention").ValueKind.Should().Be(JsonValueKind.Null);
        }
        using var guest = factory.CreateClient();
        using var read = await guest.GetAsync(created.Headers.Location);
        read.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(read)).GetProperty("id").GetGuid().Should().Be(body.GetProperty("id").GetGuid());
    }

    [Theory]
    [InlineData("plants", "")]
    [InlineData("plants", " ")]
    [InlineData("diseases", "")]
    [InlineData("diseases", " ")]
    [Trait("ApiCase", "catalog.create_empty_name")]
    public async Task Create_RejectsEmptyName(string resource, string name)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Admin(client, factory);
        using var response = await client.PostAsJsonAsync($"/api/{resource}", Body(name));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Name");
    }

    [Theory]
    [InlineData("plants", 100, HttpStatusCode.Created)]
    [InlineData("plants", 101, HttpStatusCode.BadRequest)]
    [InlineData("diseases", 100, HttpStatusCode.Created)]
    [InlineData("diseases", 101, HttpStatusCode.BadRequest)]
    [Trait("ApiCase", "catalog.create_name_boundary")]
    public async Task Create_EnforcesNameBoundary(string resource, int length, HttpStatusCode expected)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Admin(client, factory);
        var name = Guid.NewGuid().ToString("N").PadRight(length, 'x');
        using var response = await client.PostAsJsonAsync($"/api/{resource}", Body(name));
        response.StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.Created)
            (await ApiTestClient.Json(response)).GetProperty("name").GetString().Should().Be(name);
    }

    [Theory]
    [InlineData("plants", false)]
    [InlineData("plants", true)]
    [InlineData("diseases", false)]
    [InlineData("diseases", true)]
    [Trait("ApiCase", "catalog.write_authorization")]
    public async Task Write_RequiresAdminForEveryVerb(string resource, bool authenticated)
    {
        using var client = factory.CreateClient();
        if (authenticated) await ApiTestClient.Register(client);
        var expected = authenticated ? HttpStatusCode.Forbidden : HttpStatusCode.Unauthorized;
        using var create = await client.PostAsJsonAsync($"/api/{resource}", Body("denied"));
        using var update = await client.PutAsJsonAsync($"/api/{resource}/{Guid.NewGuid()}", Body("denied"));
        using var delete = await client.DeleteAsync($"/api/{resource}/{Guid.NewGuid()}");
        create.StatusCode.Should().Be(expected);
        update.StatusCode.Should().Be(expected);
        delete.StatusCode.Should().Be(expected);
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.missing_id")]
    public async Task MissingId_ReturnsNotFoundForReadUpdateDelete(string resource)
    {
        using var client = factory.CreateClient();
        await ApiTestClient.Admin(client, factory);
        var url = $"/api/{resource}/{Guid.NewGuid()}";
        using var read = await client.GetAsync(url);
        using var update = await client.PutAsJsonAsync(url, Body("not found"));
        using var delete = await client.DeleteAsync(url);
        read.StatusCode.Should().Be(HttpStatusCode.NotFound);
        update.StatusCode.Should().Be(HttpStatusCode.NotFound);
        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.update")]
    public async Task Update_PersistsFieldsReadableByGuest(string resource)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var id = await Create(admin, resource);
        var name = $"updated-{Guid.NewGuid():N}";
        using var update = await admin.PutAsJsonAsync($"/api/{resource}/{id}", new
        {
            name, vietnameseName = "Đã sửa", scientificName = "Scientific", description = "Description",
            symptoms = "Symptoms", treatment = "Treatment", prevention = "Prevention", isActive = false
        });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        using var guest = factory.CreateClient();
        using var read = await guest.GetAsync($"/api/{resource}/{id}");
        read.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(read);
        body.GetProperty("name").GetString().Should().Be(name);
        body.GetProperty("vietnameseName").GetString().Should().Be("Đã sửa");
        body.GetProperty("description").GetString().Should().Be("Description");
        body.GetProperty("isActive").GetBoolean().Should().BeFalse();
        if (resource == "plants") body.GetProperty("scientificName").GetString().Should().Be("Scientific");
        else
        {
            body.GetProperty("symptoms").GetString().Should().Be("Symptoms");
            body.GetProperty("treatment").GetString().Should().Be("Treatment");
            body.GetProperty("prevention").GetString().Should().Be("Prevention");
        }
    }

    [Theory]
    [InlineData("plants", 0)]
    [InlineData("plants", 101)]
    [InlineData("diseases", 0)]
    [InlineData("diseases", 101)]
    [Trait("ApiCase", "catalog.update_invalid_name")]
    public async Task Update_RejectsInvalidNameWithoutChangingStoredRecord(string resource, int length)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var id = await Create(admin, resource);
        using var before = await admin.GetAsync($"/api/{resource}/{id}");
        var previousName = (await ApiTestClient.Json(before)).GetProperty("name").GetString();
        using var update = await admin.PutAsJsonAsync($"/api/{resource}/{id}", Body(new string('x', length)));
        update.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var after = await admin.GetAsync($"/api/{resource}/{id}");
        (await ApiTestClient.Json(after)).GetProperty("name").GetString().Should().Be(previousName);
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.soft_delete")]
    public async Task Delete_HidesFromDefaultListAndKeepsDetailAndReferences(string resource)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var plantId = await Create(admin, "plants");
        var diseaseId = await Create(admin, "diseases");
        Guid mappingId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var mapping = new PlantDisease
            {
                PlantId = plantId, DiseaseId = diseaseId, ClassName = $"contract-{Guid.NewGuid():N}",
                ClassIndex = (await db.PlantDiseases.MaxAsync(x => (int?)x.ClassIndex) ?? -1) + 1
            };
            db.PlantDiseases.Add(mapping);
            await db.SaveChangesAsync();
            mappingId = mapping.Id;
        }
        var id = resource == "plants" ? plantId : diseaseId;
        using var deleted = await admin.DeleteAsync($"/api/{resource}/{id}");
        deleted.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var guest = factory.CreateClient();
        using var detail = await guest.GetAsync($"/api/{resource}/{id}");
        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(detail)).GetProperty("isActive").GetBoolean().Should().BeFalse();
        using var active = await guest.GetAsync($"/api/{resource}");
        using var all = await guest.GetAsync($"/api/{resource}?includeInactive=true");
        active.StatusCode.Should().Be(HttpStatusCode.OK);
        all.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(active)).EnumerateArray().Select(x => x.GetProperty("id").GetGuid()).Should().NotContain(id);
        (await ApiTestClient.Json(all)).EnumerateArray().Select(x => x.GetProperty("id").GetGuid()).Should().Contain(id);
        using var verifyScope = factory.Services.CreateScope();
        var stored = await verifyScope.ServiceProvider.GetRequiredService<AppDbContext>().PlantDiseases.SingleAsync(x => x.Id == mappingId);
        stored.PlantId.Should().Be(plantId);
        stored.DiseaseId.Should().Be(diseaseId);
    }

    [Fact]
    [Trait("ApiCase", "catalog.plant_duplicate")]
    public async Task DuplicatePlant_RejectsInputWithoutCreatingSecondRow()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var name = $"unique-{Guid.NewGuid():N}";
        using var first = await admin.PostAsJsonAsync("/api/plants", Body(name));
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        using var duplicate = await admin.PostAsJsonAsync("/api/plants", Body(name));
        duplicate.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var list = await admin.GetAsync("/api/plants?includeInactive=true");
        (await ApiTestClient.Json(list)).EnumerateArray().Count(x => x.GetProperty("name").GetString() == name).Should().Be(1);
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.duplicate_update")]
    public async Task UpdateCatalog_RejectsAnotherRecordsNameWithoutChangingEither(string resource)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var first = await Create(admin, resource);
        var second = await Create(admin, resource);
        using var originalFirst = await admin.GetAsync($"/api/{resource}/{first}");
        using var originalSecond = await admin.GetAsync($"/api/{resource}/{second}");
        var firstName = (await ApiTestClient.Json(originalFirst)).GetProperty("name").GetString()!;
        var secondName = (await ApiTestClient.Json(originalSecond)).GetProperty("name").GetString();
        using var update = await admin.PutAsJsonAsync($"/api/{resource}/{second}", Body(firstName));
        update.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var after = await admin.GetAsync($"/api/{resource}/{second}");
        (await ApiTestClient.Json(after)).GetProperty("name").GetString().Should().Be(secondName);
        using var unchanged = await admin.PutAsJsonAsync($"/api/{resource}/{first}", Body(firstName));
        unchanged.StatusCode.Should().Be(HttpStatusCode.OK, "retaining a record's own name is not a duplicate");
    }

    [Fact]
    [Trait("ApiCase", "catalog.disease_duplicate")]
    public async Task DiseaseNames_RejectDuplicateAndPreserveOriginal()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var name = $"same-{Guid.NewGuid():N}";
        using var first = await admin.PostAsJsonAsync("/api/diseases", Body(name));
        using var second = await admin.PostAsJsonAsync("/api/diseases", Body(name));
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var id = (await ApiTestClient.Json(first)).GetProperty("id").GetGuid();
        using var original = await admin.GetAsync($"/api/diseases/{id}");
        original.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(original)).GetProperty("name").GetString().Should().Be(name);
    }

    private static object Body(string name) => new { name, vietnameseName = "Tên thử", isActive = true };

    private static async Task<Guid> Create(HttpClient client, string resource)
    {
        using var response = await client.PostAsJsonAsync($"/api/{resource}", Body($"contract-{Guid.NewGuid():N}"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await ApiTestClient.Json(response)).GetProperty("id").GetGuid();
    }
}
