using System.Net;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.ApiTests.Helpers;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class CatalogDeletionTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    [Trait("ApiCase", "catalog.permanent-delete")]
    public async Task Delete_RemovesCatalogLinksButPreservesHistoryAndSharedRecords(string kind)
    {
        using var admin = factory.CreateClient();
        var userId = (await ApiTestClient.Admin(admin, factory)).User.Id;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pair = new PlantDisease {
            Plant = new Plant { Name = $"Delete_{Guid.NewGuid():N}" },
            Disease = new Disease { Name = "Historical disease", ConditionType = "Disease" },
            ClassName = $"Delete_{Guid.NewGuid():N}", ClassIndex = kind == "plants" ? 9000 : 9001
        };
        var other = new PlantDisease { Plant = new Plant { Name = $"Keep_{Guid.NewGuid():N}" },
            Disease = pair.Disease, ClassName = null, ClassIndex = null };
        var prediction = new Prediction { UserId = userId, PredictedPlantDisease = pair,
            ImagePath = "/historical.png", Confidence = .95,
            PredictionDetails = [new PredictionDetail { PlantDisease = pair, Probability = .95, Rank = 1 }] };
        var medicine = new Medicine { ProductName = "Shared medicine", ActiveIngredient = "Ingredient",
            SourceUrl = "https://example.test/label", SafetyWarning = "Warning", LabelReference = "Label" };
        medicine.Uses.Add(new MedicineUse { PlantDisease = pair, LabelDirections = "Original directions" });
        var photo = new PredictionImage { ExpiresAt = DateTime.UtcNow.AddDays(30) };
        photo.ImagePublicId = ImageStorageKey.Create(new(userId, prediction.Id, photo.Id), ".png");
        prediction.Images.Add(photo);
        var document = new KnowledgeDocument { Title = "Shared source", Content = "Keep content", SourceUrl = "https://example.test/source" };
        document.PlantDiseases.Add(new KnowledgeDocumentPlantDisease { PlantDisease = pair });
        db.KnowledgeDocuments.Add(document);
        db.PlantDiseases.AddRange(pair, other);
        db.Predictions.Add(prediction);
        db.Medicines.Add(medicine);
        await db.SaveChangesAsync();
        var id = kind == "plants" ? pair.PlantId : pair.DiseaseId;

        using var guest = factory.CreateClient();
        (await guest.DeleteAsync($"/api/admin/catalog/{kind}/{id}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var member = factory.CreateClient();
        await ApiTestClient.Register(member);
        (await member.DeleteAsync($"/api/admin/catalog/{kind}/{id}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var response = await admin.DeleteAsync($"/api/admin/catalog/{kind}/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        db.ChangeTracker.Clear();
        (await db.PlantDiseases.AnyAsync(p => p.Id == pair.Id)).Should().BeFalse();
        (await db.MedicineUses.AnyAsync(u => u.PlantDiseaseId == pair.Id)).Should().BeFalse();
        (await db.Medicines.AnyAsync(m => m.Id == medicine.Id)).Should().BeTrue();
        var saved = await db.Predictions.SingleAsync(p => p.Id == prediction.Id);
        saved.PredictedPlantDiseaseId.Should().BeNull();
        saved.ResultSnapshotJson.Should().Contain("capturedBeforeCatalogDeletion");
        (await db.PredictionImages.SingleAsync(i => i.Id == photo.Id)).ImagePublicId.Should().Be(photo.ImagePublicId);
        (await db.KnowledgeDocuments.AnyAsync(d => d.Id == document.Id)).Should().BeTrue();
        (await db.KnowledgeDocumentPlantDiseases.AnyAsync(l => l.PlantDiseaseId == pair.Id)).Should().BeFalse();
        (await db.PredictionDetails.CountAsync(p => p.PredictionId == prediction.Id)).Should().Be(1);
        if (kind == "plants")
        {
            (await db.Plants.AnyAsync(p => p.Id == id)).Should().BeFalse();
            (await db.Diseases.AnyAsync(d => d.Id == pair.DiseaseId)).Should().BeTrue();
            (await db.PlantDiseases.AnyAsync(p => p.Id == other.Id)).Should().BeTrue();
        }
        else
        {
            (await db.Diseases.AnyAsync(d => d.Id == id)).Should().BeFalse();
            (await db.Plants.AnyAsync(p => p.Id == pair.PlantId)).Should().BeTrue();
        }
        using var history = await admin.GetAsync($"/api/predictions/{prediction.Id}");
        history.StatusCode.Should().Be(HttpStatusCode.OK);
        (await history.Content.ReadAsStringAsync()).Should().Contain("Historical disease");
    }
    [Fact]
    [Trait("ApiCase", "catalog.permanent-delete.medicine")]
    public async Task DeleteMedicine_RemovesItsUsesAndPreservesThePlantDiseasePair()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pair = new PlantDisease {
            Plant = new Plant { Name = $"Keep_{Guid.NewGuid():N}" },
            Disease = new Disease { Name = $"Keep_{Guid.NewGuid():N}", ConditionType = "Disease" }
        };
        var medicine = new Medicine { ProductName = "Delete medicine", ActiveIngredient = "Ingredient",
            SourceUrl = "https://example.test/label", SafetyWarning = "Warning", LabelReference = "Label" };
        medicine.Uses.Add(new MedicineUse { PlantDisease = pair, LabelDirections = "Directions" });
        db.Medicines.Add(medicine);
        await db.SaveChangesAsync();
        (await admin.DeleteAsync($"/api/admin/catalog/medicines/{medicine.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await db.Medicines.AnyAsync(m => m.Id == medicine.Id)).Should().BeFalse();
        (await db.MedicineUses.AnyAsync(u => u.MedicineId == medicine.Id)).Should().BeFalse();
        (await db.PlantDiseases.AnyAsync(p => p.Id == pair.Id)).Should().BeTrue();
        (await admin.DeleteAsync($"/api/admin/catalog/medicines/{medicine.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.DeleteAsync($"/api/admin/catalog/unknown/{medicine.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

}
