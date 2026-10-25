using System.Net;
using System.Net.Http.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class AdminContractTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("ApiCase", "admin.authorization")]
    public async Task AllAdminRoutes_RejectGuestAndOrdinaryUser(bool authenticated)
    {
        using var client = factory.CreateClient();
        if (authenticated) await ApiTestClient.Register(client);
        var expected = authenticated ? HttpStatusCode.Forbidden : HttpStatusCode.Unauthorized;
        var id = Guid.NewGuid();
        foreach (var route in new[] { "/api/admin/users", $"/api/admin/users/{id}", "/api/admin/users/audit-logs", "/api/admin/audit-logs" })
        {
            using var response = await client.GetAsync(route);
            response.StatusCode.Should().Be(expected, "route {0} must require Admin", route);
        }
        using var status = await client.PutAsJsonAsync($"/api/admin/users/{id}/status", new { isActive = false });
        using var role = await client.PutAsJsonAsync($"/api/admin/users/{id}/role", new { role = "Admin" });
        status.StatusCode.Should().Be(expected);
        role.StatusCode.Should().Be(expected);
    }

    [Fact]
    [Trait("ApiCase", "admin.list_filters_paging")]
    public async Task List_FiltersBySearchRoleAndStatusWithPageMetadata()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        var query = $"/api/admin/users?search={Uri.EscapeDataString(user.User.Email)}&role=User&isActive=true&pageNumber=1&pageSize=1";
        using var response = await admin.GetAsync(query);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("pageNumber").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().Be(1);
        body.GetProperty("totalCount").GetInt32().Should().Be(1);
        body.GetProperty("totalPages").GetInt32().Should().Be(1);
        body.GetProperty("hasPreviousPage").GetBoolean().Should().BeFalse();
        body.GetProperty("hasNextPage").GetBoolean().Should().BeFalse();
        var item = body.GetProperty("items").EnumerateArray().Single();
        item.GetProperty("id").GetGuid().Should().Be(user.User.Id);
        item.GetProperty("email").GetString().Should().Be(user.User.Email);
        item.GetProperty("role").GetString().Should().Be("User");
        item.GetProperty("isActive").GetBoolean().Should().BeTrue();
        item.GetProperty("predictionCount").GetInt32().Should().Be(0);
        using var empty = await admin.GetAsync(query.Replace("pageNumber=1", "pageNumber=2"));
        (await ApiTestClient.Json(empty)).GetProperty("items").GetArrayLength().Should().Be(0);
        using var wrongRole = await admin.GetAsync(query.Replace("role=User", "role=Admin"));
        (await ApiTestClient.Json(wrongRole)).GetProperty("totalCount").GetInt32().Should().Be(0);
        using var inactive = await admin.GetAsync(query.Replace("isActive=true", "isActive=false"));
        (await ApiTestClient.Json(inactive)).GetProperty("totalCount").GetInt32().Should().Be(0);
    }

    [Theory]
    [InlineData("/api/admin/users", "pageNumber=0")]
    [InlineData("/api/admin/users", "pageSize=0")]
    [InlineData("/api/admin/users/audit-logs", "pageNumber=-1")]
    [InlineData("/api/admin/users/audit-logs", "pageSize=0")]
    [InlineData("/api/admin/audit-logs", "pageNumber=0")]
    [InlineData("/api/admin/audit-logs", "pageSize=-1")]
    [Trait("ApiCase", "admin.invalid_paging")]
    public async Task ListAndAudit_RejectInvalidPagination(string route, string query)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var response = await admin.GetAsync($"{route}?{query}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await ApiTestClient.Json(response)).GetProperty("statusCode").GetInt32().Should().Be(400);
    }

    [Fact]
    [Trait("ApiCase", "admin.detail")]
    public async Task Detail_ReturnsUserWithoutCredentialFields()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        using var response = await admin.GetAsync($"/api/admin/users/{user.User.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ApiTestClient.Json(response);
        body.GetProperty("id").GetGuid().Should().Be(user.User.Id);
        body.GetProperty("fullName").GetString().Should().Be(user.User.FullName);
        body.GetProperty("email").GetString().Should().Be(user.User.Email);
        body.GetProperty("predictionCount").GetInt32().Should().Be(0);
        body.TryGetProperty("passwordHash", out _).Should().BeFalse();
        body.TryGetProperty("token", out _).Should().BeFalse();
    }

    [Fact]
    [Trait("ApiCase", "admin.missing_user")]
    public async Task MissingUser_ReturnsNotFoundForReadAndUpdates()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        var url = $"/api/admin/users/{Guid.NewGuid()}";
        using var detail = await admin.GetAsync(url);
        using var status = await admin.PutAsJsonAsync($"{url}/status", new { isActive = false });
        using var role = await admin.PutAsJsonAsync($"{url}/role", new { role = "Admin" });
        detail.StatusCode.Should().Be(HttpStatusCode.NotFound);
        status.StatusCode.Should().Be(HttpStatusCode.NotFound);
        role.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("")]
    [InlineData("admin")]
    [InlineData("SuperAdmin")]
    [Trait("ApiCase", "admin.invalid_role")]
    public async Task UpdateRole_RejectsUnknownRoleWithoutChangingUser(string role)
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        using var response = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/role", new { role });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var detail = await admin.GetAsync($"/api/admin/users/{user.User.Id}");
        (await ApiTestClient.Json(detail)).GetProperty("role").GetString().Should().Be("User");
        using var me = await target.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    [Trait("ApiCase", "admin.self_protection")]
    public async Task Admin_CannotDeactivateOrDemoteSelf()
    {
        using var admin = factory.CreateClient();
        var actor = await ApiTestClient.Admin(admin, factory);
        using var status = await admin.PutAsJsonAsync($"/api/admin/users/{actor.User.Id}/status", new { isActive = false });
        using var role = await admin.PutAsJsonAsync($"/api/admin/users/{actor.User.Id}/role", new { role = "User" });
        status.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        role.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var detail = await admin.GetAsync($"/api/admin/users/{actor.User.Id}");
        var body = await ApiTestClient.Json(detail);
        body.GetProperty("role").GetString().Should().Be("Admin");
        body.GetProperty("isActive").GetBoolean().Should().BeTrue();
    }

    [Fact]
    [Trait("ApiCase", "admin.noop")]
    public async Task UnchangedStatusAndRole_KeepSessionAndDoNotCreateAudit()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        using var status = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/status", new { isActive = true });
        using var role = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/role", new { role = "User" });
        status.StatusCode.Should().Be(HttpStatusCode.OK);
        role.StatusCode.Should().Be(HttpStatusCode.OK);
        using var me = await target.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<AppDbContext>().AdminAuditLogs.CountAsync(x => x.TargetUserId == user.User.Id)).Should().Be(0);
    }

    [Theory]
    [InlineData("status", "DeactivateUser")]
    [InlineData("role", "ChangeRoleTo_Admin")]
    [Trait("ApiCase", "admin.change_revokes_and_audits")]
    public async Task StatusOrRoleChange_RevokesTargetSessionsAndBothAuditAliasesShowActorAndTarget(string operation, string action)
    {
        using var admin = factory.CreateClient();
        var actor = await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        object request = operation == "status" ? new { isActive = false } : new { role = "Admin" };
        using var change = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/{operation}", request);
        change.StatusCode.Should().Be(HttpStatusCode.OK);
        var changed = await ApiTestClient.Json(change);
        if (operation == "status") changed.GetProperty("isActive").GetBoolean().Should().BeFalse();
        else changed.GetProperty("role").GetString().Should().Be("Admin");
        using var me = await target.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var fresh = factory.CreateClient();
        using var freshLogin = await fresh.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, ApiTestClient.Password));
        freshLogin.StatusCode.Should().Be(operation == "status" ? HttpStatusCode.Unauthorized : HttpStatusCode.OK);
        if (operation == "role")
        {
            var freshBody = await ApiTestClient.Json(freshLogin);
            fresh.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", freshBody.GetProperty("token").GetString());
            using var access = await fresh.GetAsync("/api/admin/users");
            access.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        using var persisted = await admin.GetAsync($"/api/admin/users/{user.User.Id}");
        var saved = await ApiTestClient.Json(persisted);
        saved.GetProperty(operation == "status" ? "isActive" : "role").ToString().Should().Be(changed.GetProperty(operation == "status" ? "isActive" : "role").ToString());
        Guid? auditId = null;
        foreach (var route in new[] { "/api/admin/users/audit-logs", "/api/admin/audit-logs" })
        {
            using var logs = await admin.GetAsync($"{route}?pageNumber=1&pageSize=1000");
            logs.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await ApiTestClient.Json(logs);
            body.GetProperty("pageNumber").GetInt32().Should().Be(1);
            var entry = body.GetProperty("items").EnumerateArray().Single(x => x.GetProperty("targetUserId").GetGuid() == user.User.Id);
            entry.GetProperty("action").GetString().Should().Be(action);
            entry.GetProperty("actorUserId").GetGuid().Should().Be(actor.User.Id);
            entry.GetProperty("actorEmail").GetString().Should().Be(actor.User.Email);
            entry.GetProperty("targetEmail").GetString().Should().Be(user.User.Email);
            entry.GetProperty("occurredAt").GetDateTime().Should().BeAfter(DateTime.UtcNow.AddMinutes(-5));
            if (auditId.HasValue) entry.GetProperty("id").GetGuid().Should().Be(auditId.Value);
            auditId = entry.GetProperty("id").GetGuid();
        }
    }

    [Fact]
    [Trait("ApiCase", "admin.reactivate")]
    public async Task ReactivateUser_RestoresLoginAndRecordsActivationAudit()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var target = factory.CreateClient();
        var user = await ApiTestClient.Register(target);
        using var disabled = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/status", new { isActive = false });
        disabled.StatusCode.Should().Be(HttpStatusCode.OK);
        using var disabledLogin = await target.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, ApiTestClient.Password));
        disabledLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var enabled = await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/status", new { isActive = true });
        enabled.StatusCode.Should().Be(HttpStatusCode.OK);
        using var detail = await admin.GetAsync($"/api/admin/users/{user.User.Id}");
        (await ApiTestClient.Json(detail)).GetProperty("isActive").GetBoolean().Should().BeTrue();
        // Reactivation must never resurrect a previously revoked session.
        using var me = await target.GetAsync("/api/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var login = await target.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, ApiTestClient.Password));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ApiTestClient.Json(login)).GetProperty("user").GetProperty("id").GetGuid().Should().Be(user.User.Id);
        using var logs = await admin.GetAsync("/api/admin/audit-logs?pageSize=1000");
        (await ApiTestClient.Json(logs)).GetProperty("items").EnumerateArray().Should().Contain(x =>
            x.GetProperty("targetUserId").GetGuid() == user.User.Id && x.GetProperty("action").GetString() == "ActivateUser");
    }
}
