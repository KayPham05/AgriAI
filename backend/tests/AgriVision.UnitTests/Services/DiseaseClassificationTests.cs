using System.Text.Json;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class DiseaseClassificationTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Theory]
    [InlineData("Unknown")]
    [InlineData("Healthy")]
    [InlineData("NutrientDeficiency")]
    [InlineData("Disease")]
    public async Task Create_ShouldPersistExplicitClassification(string condition)
    {
        var repository = new Mock<IDiseaseRepository>();
        var service = new DiseaseService(repository.Object);
        var request = JsonSerializer.Deserialize<CreateDiseaseRequest>(
            JsonSerializer.Serialize(new { name = "Fixture", conditionType = condition }), Json)!;

        var result = await service.CreateAsync(request);

        result.ConditionType.Should().Be(condition);
        result.IsContentApproved.Should().BeFalse();
        repository.Verify(r => r.AddAsync(It.Is<Disease>(d => d.ConditionType == condition), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("Disease", "Healthy", false)]
    [InlineData("Unknown", "Disease", false)]
    [InlineData("Disease", "Disease", true)]
    [InlineData("Disease", null, true)]
    public async Task Update_ShouldRevokeReviewOnlyWhenClassificationChanges(string original, string? condition, bool approved)
    {
        var entity = new Disease { Name = "Fixture", ConditionType = original, IsContentApproved = true };
        var repository = new Mock<IDiseaseRepository>();
        repository.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var service = new DiseaseService(repository.Object);
        var request = JsonSerializer.Deserialize<UpdateDiseaseRequest>(
            JsonSerializer.Serialize(new { name = "Fixture", isActive = true, conditionType = condition }), Json)!;

        var result = await service.UpdateAsync(entity.Id, request);

        result.ConditionType.Should().Be(condition ?? original);
        result.IsContentApproved.Should().Be(approved);
        entity.ConditionType.Should().Be(condition ?? original);
    }

    [Theory]
    [InlineData("")]
    [InlineData("disease")]
    [InlineData("Other")]
    public async Task InvalidClassification_ShouldRejectBeforeChangingTrackedContent(string condition)
    {
        var entity = new Disease { Name = "Original", ConditionType = "Disease", IsContentApproved = true };
        var repository = new Mock<IDiseaseRepository>();
        repository.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var service = new DiseaseService(repository.Object);
        var payload = JsonSerializer.Serialize(new { name = "Changed", isActive = true, conditionType = condition });

        await FluentActions.Invoking(() => service.UpdateAsync(entity.Id,
            JsonSerializer.Deserialize<UpdateDiseaseRequest>(payload, Json)!)).Should().ThrowAsync<ArgumentException>();
        await FluentActions.Invoking(() => service.CreateAsync(
            JsonSerializer.Deserialize<CreateDiseaseRequest>(payload, Json)!)).Should().ThrowAsync<ArgumentException>();

        entity.Name.Should().Be("Original");
        entity.ConditionType.Should().Be("Disease");
        entity.IsContentApproved.Should().BeTrue();
        repository.Verify(r => r.UpdateAsync(It.IsAny<Disease>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PairLookup_ShouldExposeEligibilityWithoutChangingPairAvailability()
    {
        var pair = new PlantDisease { Plant = new Plant { IsActive = false }, Disease = new Disease { ConditionType = "Unknown" } };
        var repository = new Mock<IPlantDiseaseRepository>();
        repository.Setup(r => r.SearchAsync(It.IsAny<CatalogFilterParams>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<PlantDisease> { pair }, 1));
        var result = await new PlantDiseaseCatalogService(repository.Object).ListAsync(new(), false);
        var json = JsonSerializer.SerializeToElement(result, Json).GetProperty("items")[0];

        json.GetProperty("isActive").GetBoolean().Should().BeTrue();
        json.GetProperty("plantIsActive").GetBoolean().Should().BeFalse();
        json.GetProperty("diseaseIsActive").GetBoolean().Should().BeTrue();
        json.GetProperty("conditionType").GetString().Should().Be("Unknown");
    }
}
