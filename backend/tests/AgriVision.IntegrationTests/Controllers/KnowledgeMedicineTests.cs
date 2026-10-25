using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Controllers;

public class KnowledgeMedicineTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("medicines")]
    [InlineData("knowledge-documents")]
    public async Task AdminLifecycle_ShouldProtectDrafts_RequireReviewAfterEdit_AndSoftDelete(string resource)
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var pair = await PairAsync();
        var id = await CreateAsync(admin, resource, pair.Id);
        (await guest.GetAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var draft = await admin.GetFromJsonAsync<JsonElement>($"/api/admin/{resource}/{id}");
        draft.GetProperty("isApproved").GetBoolean().Should().BeFalse();

        using var invalidPublish = await admin.PutAsJsonAsync($"/api/admin/{resource}/{id}/publication",
            new { isApproved = false, isPublic = true, isActive = true });
        invalidPublish.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await PublishAsync(admin, resource, id);
        if (resource == "medicines") await AssignUseAsync(admin, id, pair.Id);

        var publicItem = await guest.GetFromJsonAsync<JsonElement>($"/api/{resource}/{id}");
        publicItem.GetProperty("id").GetGuid().Should().Be(id);
        using var update = await admin.PutAsJsonAsync($"/api/admin/{resource}/{id}", Payload(resource, pair.Id, "Updated content"));
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateResult = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateResult.GetProperty("isApproved").GetBoolean().Should().BeFalse();
        updateResult.GetProperty("isPublic").GetBoolean().Should().BeFalse();
        (await guest.GetAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        // Product edits also revoke label verification; reviewing publication alone is insufficient.
        if (resource == "medicines")
        {
            updateResult.GetProperty("uses")[0].GetProperty("isLabelVerified").GetBoolean().Should().BeFalse();
            await AssignUseAsync(admin, id, pair.Id);
        }
        await PublishAsync(admin, resource, id);
        var edited = await guest.GetFromJsonAsync<JsonElement>($"/api/{resource}/{id}");
        edited.GetProperty("isApproved").GetBoolean().Should().BeTrue();
        edited.GetProperty(resource == "medicines" ? "productName" : "title").GetString().Should().Be("Updated content");
        var filtered = await guest.GetFromJsonAsync<JsonElement>($"/api/{resource}?plantId={pair.PlantId}&diseaseId={pair.DiseaseId}&search=Updated");
        filtered.GetProperty("items").EnumerateArray().Should().Contain(item => item.GetProperty("id").GetGuid() == id);
        var wrongPair = await guest.GetFromJsonAsync<JsonElement>($"/api/{resource}?plantId={Guid.NewGuid()}");
        wrongPair.GetProperty("totalCount").GetInt32().Should().Be(0);

        (await admin.DeleteAsync($"/api/admin/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await guest.GetAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var hidden = await guest.GetFromJsonAsync<JsonElement>($"/api/{resource}?includeInactive=true&isApproved=false");
        hidden.GetProperty("items").EnumerateArray().Should().NotContain(item => item.GetProperty("id").GetGuid() == id);
        var retained = await admin.GetFromJsonAsync<JsonElement>($"/api/admin/{resource}/{id}");
        retained.GetProperty("isActive").GetBoolean().Should().BeFalse();
        retained.GetProperty("isPublic").GetBoolean().Should().BeFalse();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (resource == "medicines" ? await db.Medicines.AnyAsync(m => m.Id == id) :
            await db.KnowledgeDocuments.AnyAsync(d => d.Id == id)).Should().BeTrue();
    }

    [Theory]
    [InlineData("medicines", false)]
    [InlineData("knowledge-documents", false)]
    [InlineData("medicines", true)]
    [InlineData("knowledge-documents", true)]
    public async Task NonAdmin_ShouldNotReadOrMutateAdminResources(string resource, bool loggedIn)
    {
        using var client = loggedIn ? await CreateAccountAsync(false) : factory.CreateClient();
        var expected = loggedIn ? HttpStatusCode.Forbidden : HttpStatusCode.Unauthorized;
        foreach (var method in new[] { "GET", "POST", "PUT", "DELETE" })
        {
            using var request = new HttpRequestMessage(new HttpMethod(method),
                $"/api/admin/{resource}" + (method is "PUT" or "DELETE" ? $"/{Guid.NewGuid()}" : ""));
            request.Content = JsonContent.Create(new { });
            (await client.SendAsync(request)).StatusCode.Should().Be(expected);
        }
        using var publish = await client.PutAsJsonAsync($"/api/admin/{resource}/{Guid.NewGuid()}/publication",
            new { isApproved = true, isPublic = true, isActive = true });
        publish.StatusCode.Should().Be(expected);
    }

    [Theory]
    [InlineData("medicines")]
    [InlineData("knowledge-documents")]
    public async Task InvalidContent_ShouldBeRejected_AndPaginationValidated(string resource)
    {
        using var admin = await CreateAccountAsync(true);
        var pair = await PairAsync();
        foreach (var payload in new[] { new { } as object, Payload(resource, pair.Id, "   "),
                     Payload(resource, pair.Id, new string('x', 201)), Payload(resource, pair.Id, "Title", "javascript:alert(1)") })
            (await admin.PostAsJsonAsync($"/api/admin/{resource}", payload)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.GetAsync($"/api/{resource}?pageNumber=0")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.GetAsync($"/api/{resource}?pageSize=101")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.GetAsync($"/api/admin/{resource}/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Relations_ShouldRejectUnknownPairs_AndRequireVerifiedApprovedUses()
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var pair = await PairAsync();
        (await admin.PostAsJsonAsync("/api/admin/knowledge-documents", Payload("knowledge-documents", Guid.NewGuid())))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var id = await CreateAsync(admin, "medicines", pair.Id);
        await PublishAsync(admin, "medicines", id);
        (await admin.PutAsJsonAsync($"/api/admin/medicines/{id}/uses/{Guid.NewGuid()}",
            new { labelDirections = "Fixture label only", isLabelVerified = true, isApproved = true }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PutAsJsonAsync($"/api/admin/medicines/{id}/uses/{pair.Id}",
            new { labelDirections = "Fixture label only", isLabelVerified = false, isApproved = true }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await AssignUseAsync(admin, id, pair.Id, false);
        var unverified = await guest.GetFromJsonAsync<JsonElement>($"/api/medicines/{id}");
        unverified.GetProperty("uses").GetArrayLength().Should().Be(0);
        await AssignUseAsync(admin, id, pair.Id);
        var verified = await guest.GetFromJsonAsync<JsonElement>($"/api/medicines/{id}");
        verified.GetProperty("uses").GetArrayLength().Should().Be(1);
        (await admin.DeleteAsync($"/api/admin/medicines/{id}/uses/{pair.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await guest.GetFromJsonAsync<JsonElement>($"/api/medicines/{id}")).GetProperty("uses").GetArrayLength().Should().Be(0);
    }

    [Theory]
    [InlineData(0.8f, "Disease", true, true, 0)]
    [InlineData(0.81f, "Disease", true, true, 1)]
    [InlineData(0.95f, "Healthy", true, true, 0)]
    [InlineData(0.95f, "NutrientDeficiency", true, true, 0)]
    [InlineData(0.95f, "Disease", false, true, 0)]
    [InlineData(0.95f, "Disease", true, false, 0)]
    public async Task Diagnosis_ShouldUseOnlyEligibleMedicines_AndPreserveSnapshot(
        float confidence, string condition, bool verified, bool published, int expected)
    {
        using var admin = await CreateAccountAsync(true);
        var pair = await PairAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // Each theory uses its own eligible medicine: retire earlier fixture entries.
            await db.Medicines.ExecuteUpdateAsync(s => s.SetProperty(m => m.IsPublic, false));
            var disease = await db.Diseases.SingleAsync(d => d.Id == pair.DiseaseId);
            disease.ConditionType = "Disease";
            disease.IsContentApproved = true;
            disease.Medication = "Legacy text must not bypass label verification";
            await db.SaveChangesAsync();
        }
        var id = await CreateAsync(admin, "medicines", pair.Id);
        if (published) await PublishAsync(admin, "medicines", id);
        await AssignUseAsync(admin, id, pair.Id, verified);
        await using (var conditionScope = factory.Services.CreateAsyncScope())
        {
            var db = conditionScope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Diseases.SingleAsync(d => d.Id == pair.DiseaseId)).ConditionType = condition;
            await db.SaveChangesAsync();
        }
        using var application = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IPlantDiseasePredictor>(new FixedPredictor(confidence));
        }));
        using var user = application.CreateClient();
        await AuthorizeAsync(user, false);
        using var upload = ImageRequest();
        var response = await user.PostAsync("/api/predictions", upload);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var prediction = await response.Content.ReadFromJsonAsync<JsonElement>();
        var recommendations = prediction.GetProperty("recommendedMedicines");
        recommendations.GetArrayLength().Should().Be(expected);
        if (expected == 1)
        {
            recommendations[0].GetProperty("medicineId").GetGuid().Should().Be(id);
            recommendations[0].GetProperty("labelDirections").GetString().Should().Be("Fixture label only");
        }
        prediction.GetProperty("medication").ToString().Should().NotContain("Legacy text");
        if (expected == 0) prediction.GetProperty("medication").ValueKind.Should().Be(JsonValueKind.Null);

        using var guest = application.CreateClient();
        await using var countScope = factory.Services.CreateAsyncScope();
        var countDb = countScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = await countDb.Predictions.CountAsync();
        using var guestUpload = ImageRequest();
        var guestResponse = await guest.PostAsync("/api/predictions", guestUpload);
        guestResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await guestResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("recommendedMedicines").GetRawText()
            .Should().Be(recommendations.GetRawText());
        (await countDb.Predictions.CountAsync()).Should().Be(before);

        await admin.DeleteAsync($"/api/admin/medicines/{id}");
        var historical = await user.GetFromJsonAsync<JsonElement>($"/api/predictions/{prediction.GetProperty("id").GetGuid()}");
        historical.GetProperty("recommendedMedicines").GetRawText().Should().Be(recommendations.GetRawText());
    }

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    public async Task ExistingCatalog_ShouldValidateNames_AndHideInactiveItemsFromGuest(string resource)
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        (await admin.PostAsJsonAsync($"/api/{resource}", new { name = " " })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var response = await admin.PostAsJsonAsync($"/api/{resource}", new { name = $"fixture_{Guid.NewGuid():N}" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await admin.PutAsJsonAsync($"/api/{resource}/{id}", new { name = " ", isActive = true })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.DeleteAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await guest.GetAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var items = await guest.GetFromJsonAsync<JsonElement[]>($"/api/{resource}?includeInactive=true");
        items.Should().NotContain(item => item.GetProperty("id").GetGuid() == id);
        (await admin.GetAsync($"/api/{resource}/{id}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PublicDisease_ShouldNotExposeUnreviewedKnowledge()
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var response = await admin.PostAsJsonAsync("/api/diseases", new { name = $"fixture_{Guid.NewGuid():N}", treatment = "Unreviewed treatment" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var publicItem = await guest.GetFromJsonAsync<JsonElement>($"/api/diseases/{id}");
        publicItem.GetProperty("treatment").ToString().Should().NotBe("Unreviewed treatment");
        var adminItem = await admin.GetFromJsonAsync<JsonElement>($"/api/diseases/{id}");
        adminItem.GetProperty("treatment").GetString().Should().Be("Unreviewed treatment");
        var approvalPath = $"/api/admin/diseases/{id}/approval";
        (await guest.PutAsJsonAsync(approvalPath, new { isContentApproved = true })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var user = await CreateAccountAsync(false);
        (await user.PutAsJsonAsync(approvalPath, new { isContentApproved = true })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.PutAsJsonAsync(approvalPath, new { isContentApproved = true })).StatusCode.Should().Be(HttpStatusCode.OK);
        var approved = await guest.GetFromJsonAsync<JsonElement>($"/api/diseases/{id}");
        approved.GetProperty("treatment").GetString().Should().Be("Unreviewed treatment");
        approved.GetProperty("isContentApproved").GetBoolean().Should().BeTrue();
        var edit = await admin.PutAsJsonAsync($"/api/diseases/{id}",
            new { name = adminItem.GetProperty("name").GetString(), treatment = "Changed treatment", isActive = true });
        edit.StatusCode.Should().Be(HttpStatusCode.OK);
        (await edit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isContentApproved").GetBoolean().Should().BeFalse();
        (await guest.GetFromJsonAsync<JsonElement>($"/api/diseases/{id}")).GetProperty("treatment").ToString().Should().NotBe("Changed treatment");
        (await admin.PutAsJsonAsync($"/api/admin/diseases/{Guid.NewGuid()}/approval", new { isContentApproved = true }))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ExistingPlantDiseaseMapping_ShouldBeDiscoverable_AndAdminCanChangeOnlyAvailability()
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var pair = await PairAsync();
        var list = await guest.GetFromJsonAsync<JsonElement>($"/api/plant-diseases?plantId={pair.PlantId}&diseaseId={pair.DiseaseId}");
        list.GetProperty("items").EnumerateArray().Should().Contain(p => p.GetProperty("id").GetGuid() == pair.Id);
        (await guest.PutAsJsonAsync($"/api/admin/plant-diseases/{pair.Id}/availability", new { isActive = false }))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        try
        {
            var update = await admin.PutAsJsonAsync($"/api/admin/plant-diseases/{pair.Id}/availability",
                new { isActive = false, classIndex = 99999, className = "MustNotChange" });
            update.StatusCode.Should().Be(HttpStatusCode.OK);
            var hidden = await guest.GetFromJsonAsync<JsonElement>($"/api/plant-diseases?plantId={pair.PlantId}&diseaseId={pair.DiseaseId}");
            hidden.GetProperty("items").EnumerateArray().Should().NotContain(p => p.GetProperty("id").GetGuid() == pair.Id);
            await using var scope = factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saved = await db.PlantDiseases.SingleAsync(p => p.Id == pair.Id);
            saved.ClassIndex.Should().Be(0);
            saved.ClassName.Should().Be("Ca_chua___Chay_la_som");
        }
        finally
        {
            (await admin.PutAsJsonAsync($"/api/admin/plant-diseases/{pair.Id}/availability", new { isActive = true }))
                .StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task LabelEdit_ShouldRevokeApprovalEvenWhenTrueFlagsAreSubmitted_AndAllowSeparateReview()
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var pair = await PairAsync();
        var id = await CreateAsync(admin, "medicines", pair.Id);
        await AssignUseAsync(admin, id, pair.Id);
        await PublishAsync(admin, "medicines", id);
        var response = await admin.PutAsJsonAsync($"/api/admin/medicines/{id}/uses/{pair.Id}",
            new { labelDirections = "Changed fixture instructions", isApproved = true, isLabelVerified = true });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        edited.GetProperty("isApproved").GetBoolean().Should().BeFalse();
        edited.GetProperty("isLabelVerified").GetBoolean().Should().BeFalse();
        (await guest.GetAsync($"/api/medicines/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        // Same text, separate review: trigger must allow verification and approval now.
        var review = await admin.PutAsJsonAsync($"/api/admin/medicines/{id}/uses/{pair.Id}",
            new { labelDirections = "Changed fixture instructions", isApproved = true, isLabelVerified = true });
        (await review.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isApproved").GetBoolean().Should().BeTrue();
        await PublishAsync(admin, "medicines", id);
        (await guest.GetFromJsonAsync<JsonElement>($"/api/medicines/{id}")).GetProperty("uses").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task DocumentLinkEdit_ShouldReturnRevokedPublication_WithoutChangingArticleText()
    {
        using var admin = await CreateAccountAsync(true);
        using var guest = factory.CreateClient();
        var pair = await PairAsync();
        var id = await CreateAsync(admin, "knowledge-documents", pair.Id);
        await PublishAsync(admin, "knowledge-documents", id);
        var response = await admin.PutAsJsonAsync($"/api/admin/knowledge-documents/{id}",
            new { title = "Fixture entry", content = "Fixture article content", sourceUrl = "https://example.test/source", plantDiseaseIds = Array.Empty<Guid>() });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        edited.GetProperty("isApproved").GetBoolean().Should().BeFalse();
        edited.GetProperty("isPublic").GetBoolean().Should().BeFalse();
        edited.GetProperty("plantDiseaseIds").GetArrayLength().Should().Be(0);
        (await guest.GetAsync($"/api/knowledge-documents/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("unapproved")]
    [InlineData("private")]
    [InlineData("inactive")]
    [InlineData("use-unapproved")]
    [InlineData("label-unverified")]
    [InlineData("pair-inactive")]
    [InlineData("plant-inactive")]
    [InlineData("disease-inactive")]
    [InlineData("wrong-pair")]
    public async Task RecommendationQuery_ShouldExcludeEachIneligibleRelationship(string reason)
    {
        var pairIds = await PairAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Medicines.ExecuteUpdateAsync(s => s.SetProperty(m => m.IsPublic, false));
        var pair = await db.PlantDiseases.Include(p => p.Plant).Include(p => p.Disease)
            .SingleAsync(p => p.Id == pairIds.Id);
        var medicine = new AgriVision.Domain.Entities.Medicine
        {
            ProductName = "Eligibility fixture", ActiveIngredient = "Fixture ingredient", TargetUse = "Fixture target",
            SourceUrl = "https://example.test/source", SafetyWarning = "Test only", LabelReference = "Fixture label",
            IsApproved = true, IsPublic = true
        };
        medicine.Uses.Add(new AgriVision.Domain.Entities.MedicineUse
        {
            Medicine = medicine, PlantDisease = pair, LabelDirections = "Fixture directions",
            IsApproved = true, IsLabelVerified = true
        });
        db.Medicines.Add(medicine);
        await db.SaveChangesAsync();
        var repository = new MedicineRepository(db);
        (await repository.GetEligibleUsesAsync(pair.Id)).Should().ContainSingle(u => u.MedicineId == medicine.Id);
        var use = medicine.Uses.Single();
        switch (reason)
        {
            case "unapproved": medicine.IsApproved = false; medicine.IsPublic = false; break;
            case "private": medicine.IsPublic = false; break;
            case "inactive": medicine.IsActive = false; medicine.IsPublic = false; break;
            case "use-unapproved": use.IsApproved = false; break;
            case "label-unverified": use.IsApproved = false; use.IsLabelVerified = false; break;
            case "pair-inactive": pair.IsActive = false; break;
            case "plant-inactive": pair.Plant.IsActive = false; break;
            case "disease-inactive": pair.Disease.IsActive = false; break;
        }
        await db.SaveChangesAsync();
        (await repository.GetEligibleUsesAsync(reason == "wrong-pair" ? Guid.NewGuid() : pair.Id)).Should().BeEmpty();
        // Rollback keeps shared seed classes and earlier fixtures unchanged.
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task DocumentUpdate_ShouldRejectInvalidLinksWithoutPartiallySavingContent()
    {
        using var admin = await CreateAccountAsync(true);
        var pair = await PairAsync();
        var id = await CreateAsync(admin, "knowledge-documents", pair.Id);
        foreach (var links in new[] { new[] { pair.Id, Guid.NewGuid() }, new[] { pair.Id, pair.Id }, new[] { Guid.Empty } })
        {
            var response = await admin.PutAsJsonAsync($"/api/admin/knowledge-documents/{id}",
                new { title = "Must not save", content = "Changed", sourceUrl = "https://example.test/new", plantDiseaseIds = links });
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var saved = await admin.GetFromJsonAsync<JsonElement>($"/api/admin/knowledge-documents/{id}");
            saved.GetProperty("title").GetString().Should().Be("Fixture entry");
            saved.GetProperty("plantDiseaseIds").EnumerateArray().Select(p => p.GetGuid()).Should().Equal(pair.Id);
        }
    }

    private async Task<HttpClient> CreateAccountAsync(bool admin)
    {
        var client = factory.CreateClient();
        await AuthorizeAsync(client, admin);
        return client;
    }

    private async Task AuthorizeAsync(HttpClient client, bool admin)
    {
        var email = $"knowledge_{Guid.NewGuid():N}@example.test";
        AuthResponse auth;
        if (admin)
        {
            // Seed the required role before any session exists. Role-promotion/revocation
            // is covered by auth tests and must not make catalog fixtures clock-dependent.
            await using var scope = factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new AgriVision.Domain.Entities.User
            {
                FullName = "Knowledge admin fixture", Email = email, Role = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!")
            });
            await db.SaveChangesAsync();
            using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Password123!"));
            login.EnsureSuccessStatusCode();
            auth = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;
        }
        else
        {
            using var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Knowledge test", email, "Password123!"));
            response.EnsureSuccessStatusCode();
            auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        }
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
    }

    private async Task<(Guid Id, Guid PlantId, Guid DiseaseId)> PairAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pair = await db.PlantDiseases.Include(p => p.Disease).SingleAsync(p => p.ClassIndex == 0);
        pair.Disease.ConditionType = "Disease";
        pair.Disease.IsContentApproved = true;
        await db.SaveChangesAsync();
        return (pair.Id, pair.PlantId, pair.DiseaseId);
    }

    private static object Payload(string resource, Guid pair, string title = "Fixture entry", string source = "https://example.test/source") =>
        resource == "medicines" ? new { productName = title, activeIngredient = "Fixture ingredient", targetUse = "Fixture use",
            sourceUrl = source, safetyWarning = "Fixture only, not for actual use", labelReference = "https://example.test/label" } :
        new { title, content = "Fixture article content", sourceUrl = source, plantDiseaseIds = new[] { pair } };

    private static async Task<Guid> CreateAsync(HttpClient admin, string resource, Guid pair)
    {
        using var response = await admin.PostAsJsonAsync($"/api/admin/{resource}", Payload(resource, pair));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task PublishAsync(HttpClient admin, string resource, Guid id)
    {
        using var response = await admin.PutAsJsonAsync($"/api/admin/{resource}/{id}/publication",
            new { isApproved = true, isPublic = true, isActive = true });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static async Task AssignUseAsync(HttpClient admin, Guid id, Guid pair, bool verified = true)
    {
        using var response = await admin.PutAsJsonAsync($"/api/admin/medicines/{id}/uses/{pair}",
            new { labelDirections = "Fixture label only", isLabelVerified = verified, isApproved = verified });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static MultipartFormDataContent ImageRequest()
    {
        var request = new MultipartFormDataContent();
        request.Add(new ByteArrayContent([0xFF, 0xD8, 0xFF, 0x01]), "file", "leaf.jpg");
        return request;
    }

    private sealed class FixedPredictor(float confidence) : IPlantDiseasePredictor
    {
        public Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<AiPredictionResult> PredictAsync(Stream stream, string fileName, CancellationToken cancellationToken = default) =>
            Task.FromResult(new AiPredictionResult(0, "Ca_chua___Chay_la_som", confidence,
                [new AiPredictionTopKItem(0, "Ca_chua___Chay_la_som", confidence)]));
    }
}
