using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;

namespace AgriVision.UnitTests.Services;

public class CatalogHistoryPreservationTests
{
    [Fact]
    public void ExistingSnapshot_IsNeverReconstructedFromCurrentCatalogContent()
    {
        const string original = "{\"capturedAtPrediction\":\"original content\"}";
        var prediction = new Prediction { ResultSnapshotJson = original };
        // No current catalog navigation is needed when an original snapshot exists.
        PredictionService.PreserveBeforeCatalogDeletion(prediction);
        prediction.ResultSnapshotJson.Should().Be(original);
    }

    [Fact]
    public void LegacySnapshot_PreservesReadableContentWithoutClaimingHistoricalCapture()
    {
        var pair = new PlantDisease {
            Plant = new Plant { Name = "Original plant" },
            Disease = new Disease { Name = "Original disease", Symptoms = "Original symptoms" },
            ClassIndex = 1, ClassName = "Original___Disease"
        };
        var prediction = new Prediction { PredictedPlantDisease = pair,
            PredictionDetails = [new PredictionDetail { PlantDisease = pair, Probability = .9, Rank = 1 }] };
        PredictionService.PreserveBeforeCatalogDeletion(prediction);
        var snapshot = prediction.ResultSnapshotJson;
        snapshot.Should().Contain("Original symptoms").And.Contain("\"capturedBeforeCatalogDeletion\":true");
        pair.Disease.Symptoms = "Changed symptoms";
        PredictionService.PreserveBeforeCatalogDeletion(prediction);
        prediction.ResultSnapshotJson.Should().Be(snapshot);
    }
}
