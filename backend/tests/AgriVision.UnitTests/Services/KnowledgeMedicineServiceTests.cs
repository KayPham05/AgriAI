using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.Medicine;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class KnowledgeMedicineServiceTests
{
    [Theory]
    [InlineData(0.8f, "Disease", true, true, false)]
    [InlineData(0.81f, "Disease", true, true, true)]
    [InlineData(0.9f, "Healthy", true, true, false)]
    [InlineData(0.9f, "NutrientDeficiency", true, true, false)]
    [InlineData(0.9f, "Disease", false, true, false)]
    [InlineData(0.9f, "Disease", true, false, false)]
    [InlineData(float.NaN, "Disease", true, true, false)]
    [InlineData(float.PositiveInfinity, "Disease", true, true, false)]
    [InlineData(1.1f, "Disease", true, true, false)]
    public async Task Recommendation_ShouldGateConfidenceAndCondition(float confidence, string condition, bool approved, bool active, bool expected)
    {
        var pair = new PlantDisease { Plant = new Plant(), Disease = new Disease { ConditionType = condition, IsContentApproved = approved }, IsActive = active };
        var pairs = new Mock<IPlantDiseaseRepository>();
        pairs.Setup(p => p.GetByIdAsync(pair.Id, It.IsAny<CancellationToken>())).ReturnsAsync(pair);
        var medicine = new Medicine { ProductName = "Fixture", SourceUrl = "https://example.test/source", SafetyWarning = "Test only" };
        var repository = new Mock<IMedicineRepository>();
        repository.Setup(r => r.GetEligibleUsesAsync(pair.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new MedicineUse { MedicineId = medicine.Id, PlantDiseaseId = pair.Id, Medicine = medicine, LabelDirections = "Approved fixture label" } });

        var result = await new MedicineService(repository.Object, pairs.Object).RecommendAsync(pair.Id, confidence);

        result.Should().HaveCount(expected ? 1 : 0);
        if (expected)
        {
            result[0].MedicineId.Should().Be(medicine.Id);
            result[0].LabelDirections.Should().Be("Approved fixture label");
            result[0].SourceUrl.Should().Be("https://example.test/source");
        }
        else repository.Verify(r => r.GetEligibleUsesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task Publication_ShouldRejectPublicContentWithoutApprovalOrActivity(bool approved, bool active)
    {
        var medicines = new MedicineService(Mock.Of<IMedicineRepository>(), Mock.Of<IPlantDiseaseRepository>());
        var documents = new KnowledgeDocumentService(Mock.Of<IKnowledgeDocumentRepository>(), Mock.Of<IPlantDiseaseRepository>());
        var request = new CatalogPublicationRequest(approved, true, active);
        await FluentActions.Invoking(() => medicines.PublishAsync(Guid.NewGuid(), request)).Should().ThrowAsync<ArgumentException>();
        await FluentActions.Invoking(() => documents.PublishAsync(Guid.NewGuid(), request)).Should().ThrowAsync<ArgumentException>();
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("file:///tmp/data")]
    [InlineData("relative/path")]
    [InlineData("https://user:password@example.test/source")]
    public async Task Content_ShouldRejectUnsafeSourceUrls(string source)
    {
        var service = new MedicineService(Mock.Of<IMedicineRepository>(), Mock.Of<IPlantDiseaseRepository>());
        var request = new CreateMedicineRequest("Name", "Ingredient", "Target", source, "Warning", "Label");
        await FluentActions.Invoking(() => service.CreateAsync(request)).Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ContentEdit_ShouldReturnPersistedReviewState_AndRejectPartialInvalidChanges()
    {
        var entity = new Medicine { ProductName = "Original", IsApproved = true, IsPublic = true };
        var repository = new Mock<IMedicineRepository>();
        repository.Setup(r => r.GetAsync(entity.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        repository.Setup(r => r.GetAsync(entity.Id, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Medicine { Id = entity.Id, ProductName = "Changed", IsApproved = false, IsPublic = false });
        var service = new MedicineService(repository.Object, Mock.Of<IPlantDiseaseRepository>());
        var invalid = new UpdateMedicineRequest("Changed", "Ingredient", "Target", "not-a-url", "Warning", "Label");
        await FluentActions.Invoking(() => service.UpdateAsync(entity.Id, invalid)).Should().ThrowAsync<ArgumentException>();
        entity.ProductName.Should().Be("Original");
        var result = await service.UpdateAsync(entity.Id, invalid with { SourceUrl = "https://example.test/source" });
        result.ProductName.Should().Be("Changed");
        result.IsApproved.Should().BeFalse();
        result.IsPublic.Should().BeFalse();
    }

    [Fact]
    public async Task DocumentUpdate_ShouldKeepOldContentAndLinks_WhenAnyNewPairIsInvalid()
    {
        var entity = new KnowledgeDocument { Title = "Original", Content = "Original content" };
        var repository = new Mock<IKnowledgeDocumentRepository>();
        repository.Setup(r => r.GetAsync(entity.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var service = new KnowledgeDocumentService(repository.Object, Mock.Of<IPlantDiseaseRepository>());
        var request = new UpdateKnowledgeDocumentRequest("Changed", "Changed content", "https://example.test/source", [Guid.NewGuid()]);

        await FluentActions.Invoking(() => service.UpdateAsync(entity.Id, request)).Should().ThrowAsync<ArgumentException>();

        entity.Title.Should().Be("Original");
        entity.Content.Should().Be("Original content");
        repository.Verify(r => r.SaveAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LabelDirectionsEdit_ShouldReturnPersistedVerification_WhenFlagsAreOmitted()
    {
        var pair = new PlantDisease { Plant = new Plant(), Disease = new Disease { ConditionType = "Disease" } };
        var entity = new Medicine();
        entity.Uses.Add(new MedicineUse { MedicineId = entity.Id, PlantDiseaseId = pair.Id,
            PlantDisease = pair, LabelDirections = "Original", IsApproved = true, IsLabelVerified = true });
        var repository = new Mock<IMedicineRepository>();
        repository.Setup(r => r.GetAsync(entity.Id, true, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var saved = new Medicine { Id = entity.Id };
        saved.Uses.Add(new MedicineUse { MedicineId = entity.Id, PlantDiseaseId = pair.Id,
            PlantDisease = pair, LabelDirections = "Changed", IsApproved = false, IsLabelVerified = false });
        repository.Setup(r => r.GetAsync(entity.Id, false, It.IsAny<CancellationToken>())).ReturnsAsync(saved);
        var pairs = new Mock<IPlantDiseaseRepository>();
        pairs.Setup(p => p.GetByIdAsync(pair.Id, It.IsAny<CancellationToken>())).ReturnsAsync(pair);
        var service = new MedicineService(repository.Object, pairs.Object);
        // Deserialize an actual partial flag payload to exercise the JSON contract's defaults.
        var request = System.Text.Json.JsonSerializer.Deserialize<AssignMedicineUseRequest>(
            "{\"labelDirections\":\"Changed\"}", new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!;

        var result = await service.AssignUseAsync(entity.Id, pair.Id, request);

        result.IsApproved.Should().BeFalse();
        result.IsLabelVerified.Should().BeFalse();
        result.LabelDirections.Should().Be("Changed");
    }
}
