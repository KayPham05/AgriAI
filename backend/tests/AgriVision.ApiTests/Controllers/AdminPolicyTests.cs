using System.Net;
using System.Net.Http.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class AdminPolicyTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Fact, Trait("ApiCase", "admin.policy.session")]
    public async Task AdminActions_ReturnDistinctSessionReasons_AndNotifyRestorationOnce()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var owner = factory.CreateClient();
        var account = await ApiTestClient.Register(owner);
        (await admin.PostAsync($"/api/admin/users/{account.User.Id}/logout-all", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var revoked = await owner.GetAsync("/api/auth/me");
        revoked.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ApiTestClient.Json(revoked)).GetProperty("code").GetString().Should().Be("admin_logout");
        (await admin.PutAsJsonAsync($"/api/admin/users/{account.User.Id}/status", new { isActive = false, reason = "Policy violation" })).EnsureSuccessStatusCode();
        var locked = await ApiTestClient.Json(await owner.GetAsync("/api/auth/me"));
        locked.GetProperty("code").GetString().Should().Be("account_locked");
        locked.GetProperty("message").GetString().Should().Contain("Policy violation");
        for (var attempt = 0; attempt < 2; attempt++)
            (await admin.PutAsJsonAsync($"/api/admin/users/{account.User.Id}/status", new { isActive = true })).EnsureSuccessStatusCode();
        (await owner.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var login = await owner.PostAsJsonAsync("/api/auth/login", new { email = account.User.Email, password = ApiTestClient.Password });
        var token = (await ApiTestClient.Json(login)).GetProperty("token").GetString();
        owner.DefaultRequestHeaders.Authorization = new("Bearer", token);
        var notices = await ApiTestClient.Json(await owner.GetAsync("/api/users/notifications"));
        notices.GetProperty("totalCount").GetInt32().Should().Be(1);
        notices.GetProperty("items")[0].GetProperty("kind").GetString().Should().Be("AccountRestored");
    }

    [Fact, Trait("ApiCase", "admin.policy.pairs")]
    public async Task AdminCanCreateAndReactivateCatalogPair_WithoutInventingAiClass()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var guest = factory.CreateClient();
        var plant = await ApiTestClient.Json(await admin.PostAsJsonAsync("/api/plants", new { name = "Pair fixture " + Guid.NewGuid() }));
        var disease = await ApiTestClient.Json(await admin.PostAsJsonAsync("/api/diseases", new { name = "Disease fixture " + Guid.NewGuid(), conditionType = "Disease" }));
        var body = new { plantId = plant.GetProperty("id").GetGuid(), diseaseId = disease.GetProperty("id").GetGuid() };
        (await guest.PostAsJsonAsync("/api/admin/plant-diseases", body)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var response = await admin.PostAsJsonAsync("/api/admin/plant-diseases", body);
        response.EnsureSuccessStatusCode();
        var pair = await ApiTestClient.Json(response);
        pair.GetProperty("classIndex").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        pair.GetProperty("className").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        var id = pair.GetProperty("id").GetGuid();
        (await admin.PutAsJsonAsync($"/api/admin/plant-diseases/{id}/availability", new { isActive = false })).EnsureSuccessStatusCode();
        var hidden = await ApiTestClient.Json(await guest.GetAsync($"/api/plant-diseases?plantId={body.plantId}"));
        hidden.GetProperty("totalCount").GetInt32().Should().Be(0);
        var anotherDisease = await ApiTestClient.Json(await admin.PostAsJsonAsync("/api/diseases", new { name = "Other disease " + Guid.NewGuid(), conditionType = "NutrientDeficiency" }));
        var anotherPair = await ApiTestClient.Json(await admin.PostAsJsonAsync("/api/admin/plant-diseases", new { body.plantId, diseaseId = anotherDisease.GetProperty("id").GetGuid() }));
        anotherPair.GetProperty("id").GetGuid().Should().NotBe(id);
        var restored = await ApiTestClient.Json(await admin.PostAsJsonAsync("/api/admin/plant-diseases", body));
        restored.GetProperty("id").GetGuid().Should().Be(id);
        restored.GetProperty("isActive").GetBoolean().Should().BeTrue();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.PlantDiseases.CountAsync(p => p.PlantId == body.plantId && p.DiseaseId == body.diseaseId)).Should().Be(1);
    }
}
