using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Implementations;
using AgriVision.Application.Services.Interfaces;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public partial class PredictionServiceTests
{
    [Fact]
    public async Task GuestSave_ImageRetentionStartsAtSaveTime_WhileDiagnosisKeepsItsOriginalTime()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var diagnosedAt = DateTime.UtcNow.AddMinutes(-30);
        var delayed = _guestStore.Store(guest with { CreatedAt = diagnosedAt }, [1, 2], "guest.jpg");
        var beforeSave = DateTime.UtcNow;
        var saved = await _predictionService.SaveGuestAsync(delayed.GuestToken!, Guid.NewGuid());
        var image = _predictionRepository.AddedPredictions.Single().Images.Single();
        saved.CreatedAt.Should().Be(diagnosedAt);
        image.UploadedAt.Should().BeOnOrAfter(beforeSave).And.BeOnOrBefore(DateTime.UtcNow);
        image.ExpiresAt.Should().Be(image.UploadedAt.AddDays(30));
    }

    [Fact]
    public async Task GuestSave_PreservesOriginalResultAndBytes_WithoutRepeatingInference()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var image = await _predictionService.ReadGuestImageAsync(guest.GuestToken!);
        image.Should().NotBeNull();
        image!.Content.Should().Equal(_diseasePredictor.PredictedImageBytes!);
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        // A later catalog change must not rewrite the diagnosis shown to the guest.
        _plantDiseaseRepository.PlantDiseases = [];
        _diseasePredictor.Error = new InvalidOperationException("Inference must not run during save.");
        var owner = Guid.NewGuid();

        var saved = await _predictionService.SaveGuestAsync(guest.GuestToken!, owner);

        saved.Id.Should().Be(guest.Id);
        saved.CreatedAt.Should().Be(guest.CreatedAt);
        saved.PredictedPlantDisease.Should().BeEquivalentTo(guest.PredictedPlantDisease);
        saved.Confidence.Should().Be(guest.Confidence);
        saved.GuestToken.Should().BeNull();
        saved.GuestExpiresAt.Should().BeNull();
        saved.HasHistoricalSnapshot.Should().BeTrue();
        saved.Images.Should().ContainSingle();
        var stored = _predictionRepository.AddedPredictions.Should().ContainSingle().Subject;
        stored.UserId.Should().Be(owner);
        stored.PredictedPlantDiseaseId.Should().BeNull();
        _imageStorage.UploadedImageBytes.Should().Equal(image.Content);
        _diseasePredictor.PredictCount.Should().Be(1);
        (await _predictionService.ReadGuestImageAsync(guest.GuestToken!)).Should().BeNull();
    }

    [Fact]
    public async Task GuestSave_ConcurrentRetriesCreateOnlyOnePredictionAndUpload()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var owner = Guid.NewGuid();
        var results = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ =>
            Task.Run(() => _predictionService.SaveGuestAsync(guest.GuestToken!, owner))));
        results.Should().OnlyContain(item => item.Id == guest.Id && item.GuestToken == null);
        _predictionRepository.AddedPredictions.Should().ContainSingle();
        _imageStorage.UploadCount.Should().Be(1);
        _diseasePredictor.PredictCount.Should().Be(1);
    }

    [Fact]
    public async Task GuestSave_FailedPersistenceRetainsPreviewAndAllowsOnlyOriginalOwnerToRetry()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var owner = Guid.NewGuid();
        _predictionRepository.WriteError = new InvalidOperationException("Database unavailable");
        await FluentActions.Invoking(() => _predictionService.SaveGuestAsync(guest.GuestToken!, owner))
            .Should().ThrowAsync<InvalidOperationException>();
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.DeletedPublicIds.Should().ContainSingle();
        (await _predictionService.ReadGuestImageAsync(guest.GuestToken!)).Should().NotBeNull();
        await FluentActions.Invoking(() => _predictionService.SaveGuestAsync(guest.GuestToken!, Guid.NewGuid()))
            .Should().ThrowAsync<KeyNotFoundException>();
        _predictionRepository.WriteError = null;
        (await _predictionService.SaveGuestAsync(guest.GuestToken!, owner)).Id.Should().Be(guest.Id);
        _predictionRepository.AddedPredictions.Should().ContainSingle();
        _diseasePredictor.PredictCount.Should().Be(1);
    }

    [Fact]
    public async Task GuestSave_DoesNotResurrectADeletedSavedPrediction()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var owner = Guid.NewGuid();
        await _predictionService.SaveGuestAsync(guest.GuestToken!, owner);
        await _predictionService.DeletePredictionAsync(guest.Id, owner, false);
        await FluentActions.Invoking(() => _predictionService.SaveGuestAsync(guest.GuestToken!, owner))
            .Should().ThrowAsync<KeyNotFoundException>();
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.UploadCount.Should().Be(1);
    }

    [Fact]
    public async Task GuestSaveAndPreview_RejectExpiredEntryEvenIfStoreReturnsIt()
    {
        ConfigureHealthyClass();
        var guest = await _predictionService.PredictAsync(CreateFile(), null);
        var store = new Mock<IGuestPredictionStore>();
        store.Setup(s => s.Find(guest.GuestToken!)).Returns(new GuestPrediction(
            guest, [1, 2], "guest.jpg", DateTime.UtcNow.AddSeconds(-1)));
        var service = new PredictionService(_predictionRepository, _plantDiseaseRepository,
            _imageStorage, _diseasePredictor, _profileRepository.Object,
            Mock.Of<IMedicineService>(), _journal.Object, guestPredictions: store.Object);
        (await service.ReadGuestImageAsync(guest.GuestToken!)).Should().BeNull();
        await FluentActions.Invoking(() => service.SaveGuestAsync(guest.GuestToken!, Guid.NewGuid()))
            .Should().ThrowAsync<KeyNotFoundException>();
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Fact]
    public async Task GuestStore_EvictsOldestEntryUnderCapacityPressure_WithoutMixingImages()
    {
        ConfigureHealthyClass();
        var first = await _predictionService.PredictAsync(CreateFile(), null);
        var last = first;
        for (var i = 0; i < 256; i++) last = _guestStore.Store(first, [(byte)i], "guest.png");
        _guestStore.Find(first.GuestToken!).Should().BeNull();
        _guestStore.Find(last.GuestToken!)!.Image.Should().Equal(255);
        (await _predictionService.ReadGuestImageAsync(last.GuestToken!))!.ContentType.Should().Be("image/png");
        await FluentActions.Invoking(() => _predictionService.SaveGuestAsync(first.GuestToken!, Guid.NewGuid()))
            .Should().ThrowAsync<KeyNotFoundException>();
    }
}
