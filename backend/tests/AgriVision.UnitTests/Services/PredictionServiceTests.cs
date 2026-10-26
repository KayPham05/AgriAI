using System.Text;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Implementations;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Application.DTOs.Medicine;

namespace AgriVision.UnitTests.Services;

public class PredictionServiceTests
{
    private readonly RecordingPredictionRepository _predictionRepository;
    private readonly StubPlantDiseaseRepository _plantDiseaseRepository;
    private readonly RecordingImageStorage _imageStorage;
    private readonly RecordingPlantDiseasePredictor _diseasePredictor;
    private readonly PredictionService _predictionService;
    private readonly Mock<IImageUploadJournal> _journal = new();
    private readonly Mock<IAgriculturalProfileRepository> _profileRepository = new();

    public PredictionServiceTests()
    {
        _predictionRepository = new RecordingPredictionRepository();
        _plantDiseaseRepository = new StubPlantDiseaseRepository();
        _imageStorage = new RecordingImageStorage();
        _diseasePredictor = new RecordingPlantDiseasePredictor();
        var medicines = new Mock<IMedicineService>();
        medicines.Setup(m => m.RecommendAsync(It.IsAny<Guid>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RecommendedMedicineDto>());

        _predictionService = new PredictionService(
            _predictionRepository,
            _plantDiseaseRepository,
            _imageStorage,
            _diseasePredictor,
            _profileRepository.Object,
            medicines.Object,
            _journal.Object
        );
    }

    [Fact]
    public async Task PredictAsync_ShouldReturnPredictionResult_WhenImageIsValid()
    {
        // Arrange
        var content = "Fake Image Bytes Content";
        var expectedImageBytes = Encoding.UTF8.GetBytes(content);
        var fileName = "leaf.jpeg";
        var stream = new MemoryStream(expectedImageBytes);
        var formFile = new FormFile(stream, 0, stream.Length, "file", fileName);

        var uploadResult = new ImageUploadResult("r2/predictions/leaf.jpeg", string.Empty);
        _imageStorage.UploadResult = uploadResult;

        var aiPredictionResult = new AiPredictionResult(
            ClassIndex: 5,
            ClassName: "Tomato___Bacterial_spot",
            Confidence: 0.958f,
            TopK: new List<AiPredictionTopKItem>
            {
                new(5, "Tomato___Bacterial_spot", 0.958f),
                new(6, "Tomato___Early_blight", 0.032f)
            }
        );

        _diseasePredictor.Result = aiPredictionResult;

        var plant = new Plant { Id = Guid.NewGuid(), Name = "Tomato", VietnameseName = "Cà chua" };
        var disease = new Disease { Id = Guid.NewGuid(), Name = "Bacterial spot", VietnameseName = "Đốm vi khuẩn" };
        var plantDisease = new PlantDisease
        {
            Id = Guid.NewGuid(),
            PlantId = plant.Id,
            Plant = plant,
            DiseaseId = disease.Id,
            Disease = disease,
            ClassIndex = 5,
            ClassName = "Tomato___Bacterial_spot"
        };

        _plantDiseaseRepository.PlantDiseases = [plantDisease, new PlantDisease
        {
            Id = Guid.NewGuid(), ClassIndex = 6, ClassName = "Tomato___Early_blight", Plant = plant, Disease = disease
        }];

        // Act
        var result = await _predictionService.PredictAsync(formFile, userId: Guid.NewGuid());

        // Assert
        result.Should().NotBeNull();
        result.ImagePath.Should().Be($"/api/predictions/{result.Id}/images/{result.Images.Single().Id}");
        result.Confidence.Should().Be(0.958f);
        result.PredictedPlantDisease.ClassName.Should().Be("Tomato___Bacterial_spot");
        result.PredictedPlantDisease.Plant.Name.Should().Be("Tomato");
        result.PredictedPlantDisease.Disease.Name.Should().Be("Bacterial spot");
        _imageStorage.UploadedImageBytes.Should().Equal(expectedImageBytes);
        _diseasePredictor.PredictedImageBytes.Should().Equal(expectedImageBytes);
        _imageStorage.ReceivedStream.Should().NotBeSameAs(_diseasePredictor.ReceivedStream);

        _predictionRepository.AddedPredictions.Should().ContainSingle();
        _imageStorage.UploadCount.Should().Be(1);
        _diseasePredictor.PredictCount.Should().Be(1);
        result.Images.Should().ContainSingle();
        result.HasHistoricalSnapshot.Should().BeTrue();
    }

    [Fact]
    public async Task PredictAsync_ShouldThrowArgumentException_WhenInvalidFileExtension()
    {
        // Arrange
        var stream = new MemoryStream(Encoding.UTF8.GetBytes("exe content"));
        var formFile = new FormFile(stream, 0, stream.Length, "file", "malicious.exe");

        // Act
        var act = async () => await _predictionService.PredictAsync(formFile, userId: null);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Invalid file extension*");
    }

    [Fact]
    public async Task PredictAsync_ShouldThrowArgumentException_WhenFileIsEmpty()
    {
        // Arrange
        var formFile = new FormFile(Stream.Null, 0, 0, "file", "empty.jpg");

        // Act
        var act = async () => await _predictionService.PredictAsync(formFile, userId: null);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*No image file uploaded*");
        _imageStorage.UploadCount.Should().Be(0);
        _diseasePredictor.PredictCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task PredictAsync_ShouldNotPersistPrediction_WhenAiServiceFails()
    {
        var imageBytes = Encoding.UTF8.GetBytes("leaf image");
        var formFile = new FormFile(new MemoryStream(imageBytes), 0, imageBytes.Length, "file", "leaf.jpg");
        _diseasePredictor.Error = new AiServiceException("AI service timed out.", System.Net.HttpStatusCode.ServiceUnavailable);

        var act = () => _predictionService.PredictAsync(formFile, userId: null);

        await act.Should().ThrowAsync<AiServiceException>();
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Fact]
    public async Task Guests_ShouldNotStoreImagesOrHistory()
    {
        ConfigureHealthyClass();
        var result = await _predictionService.PredictAsync(CreateFile(), null);
        result.PredictedPlantDisease.ClassName.Should().Be("Tomato___Healthy");
        result.HasHistoricalSnapshot.Should().BeFalse();
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ProfileSelection_RejectsForeignOrMissingProfileBeforeInferenceAndStorage(bool missing)
    {
        var owner = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        if (!missing)
            _profileRepository.Setup(repository => repository.GetByIdAsync(profileId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AgriculturalProfile { Id = profileId, UserId = Guid.NewGuid() });
        var action = () => _predictionService.PredictAsync(CreateFile(), owner, profileId);
        await action.Should().ThrowAsync<KeyNotFoundException>();
        _diseasePredictor.PredictCount.Should().Be(0);
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task ProfileSelection_RejectsGuestBeforeRepositoryInferenceOrStorage()
    {
        var action = () => _predictionService.PredictAsync(CreateFile(), null, Guid.NewGuid());
        await action.Should().ThrowAsync<UnauthorizedAccessException>();
        _profileRepository.VerifyNoOtherCalls();
        _diseasePredictor.PredictCount.Should().Be(0);
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task ProfileSelection_PersistsLinkAndSnapshot_AndReadReflectsRemovedLink()
    {
        ConfigureHealthyClass();
        var owner = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        _profileRepository.Setup(repository => repository.GetByIdAsync(profileId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AgriculturalProfile { Id = profileId, UserId = owner });
        var result = await _predictionService.PredictAsync(CreateFile(), owner, profileId);
        result.AgriculturalProfileId.Should().Be(profileId);
        var saved = _predictionRepository.AddedPredictions.Single();
        saved.AgriculturalProfileId.Should().Be(profileId);
        var snapshot = saved.ResultSnapshotJson;
        saved.AgriculturalProfileId = null;
        var stored = await _predictionService.GetPredictionByIdAsync(result.Id, userId: owner);
        stored!.AgriculturalProfileId.Should().BeNull();
        var history = await _predictionService.GetPredictionHistoryAsync(owner);
        history.Items.Single().AgriculturalProfileId.Should().BeNull();
        saved.ResultSnapshotJson.Should().Be(snapshot);
    }

    [Fact]
    public async Task CancelledGuestUpload_ShouldNotInvokeAiOrStoreData()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        var act = () => _predictionService.PredictAsync(CreateFile(), null, cancellationToken: cancellation.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        _diseasePredictor.PredictCount.Should().Be(0);
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task MissingGuestUpload_ShouldNotInvokeAiOrStoreData()
    {
        var act = () => _predictionService.PredictAsync(null!, null);

        await act.Should().ThrowAsync<ArgumentException>();
        _diseasePredictor.PredictCount.Should().Be(0);
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task GuestPrediction_ShouldNotBeAvailableAsSavedHistory()
    {
        ConfigureHealthyClass();
        var result = await _predictionService.PredictAsync(CreateFile(), null);

        (await _predictionService.GetPredictionByIdAsync(result.Id, userId: Guid.NewGuid())).Should().BeNull();
        _diseasePredictor.ReceivedStream!.CanRead.Should().BeFalse();
        _imageStorage.UploadCount.Should().Be(0);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task MappingMismatch_ShouldFailBeforeStorage()
    {
        ConfigureHealthyClass();
        _diseasePredictor.Result = new(0, "WrongClass", 1, []);
        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*does not match*");
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Fact]
    public async Task TopKMappingMismatch_ShouldFailBeforeStorage()
    {
        ConfigureHealthyClass();
        _diseasePredictor.Result = new(0, "Tomato___Healthy", 1, [new(99, "WrongClass", 0.1f)]);
        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*top-k*");
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Fact]
    public async Task OversizedImage_IsRejectedBeforeInferenceOrStorage()
    {
        using var bytes = new MemoryStream([1]);
        var file = new FormFile(bytes, 0, 15L * 1024 * 1024 + 1, "file", "leaf.png");
        await FluentActions.Invoking(() => _predictionService.PredictAsync(file, Guid.NewGuid()))
            .Should().ThrowAsync<ArgumentException>().WithMessage("*15 MB*");
        _diseasePredictor.PredictCount.Should().Be(0);
        _imageStorage.UploadCount.Should().Be(0);
    }

    [Fact]
    public async Task AmbiguousUploadCancellation_ShouldCleanKnownKey_WithoutSavingPrediction()
    {
        ConfigureHealthyClass();
        _imageStorage.UploadError = new TaskCanceledException();
        await FluentActions.Invoking(() => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid()))
            .Should().ThrowAsync<OperationCanceledException>();
        _imageStorage.DeletedPublicIds.Should().ContainSingle().Which.Should().StartWith("users/");
        _journal.Verify(journal => journal.CompleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
    }

    [Fact]
    public async Task DatabaseWriteFailure_ShouldCleanUploadedImage()
    {
        ConfigureHealthyClass();
        _predictionRepository.WriteError = new InvalidOperationException("Database write failed.");
        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Database write failed.");
        _imageStorage.DeletedPublicIds.Should().ContainSingle().Which.Should().Be(_imageStorage.UploadResult.PublicId);
    }

    [Fact]
    public async Task DatabaseWriteFailure_ShouldPreserveOriginalError_WhenCleanupAlsoFails()
    {
        ConfigureHealthyClass();
        _predictionRepository.WriteError = new InvalidOperationException("Database write failed.");
        _imageStorage.DeleteError = new IOException("Storage unavailable.");
        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Database write failed.");
    }

    [Fact]
    public async Task DeletePrediction_ShouldRejectOtherOwner_BeforeDeletingImages()
    {
        ConfigureHealthyClass();
        var result = await _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());
        var act = () => _predictionService.DeletePredictionAsync(result.Id, Guid.NewGuid());
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _imageStorage.DeletedPublicIds.Should().BeEmpty();
        _predictionRepository.AddedPredictions.Should().ContainSingle();
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(1, 0)]
    public async Task History_ShouldRejectInvalidPagination(int page, int size)
    {
        var act = () => _predictionService.GetPredictionHistoryAsync(Guid.NewGuid(), page, size);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Theory]
    [InlineData("Healthy", true)]
    [InlineData("NutrientDeficiency", true)]
    [InlineData("Disease", false)]
    public async Task Medication_ShouldBeHidden_ForHealthyNutrientOrUnapprovedContent(string condition, bool approved)
    {
        ConfigureHealthyClass();
        var disease = _plantDiseaseRepository.PlantDiseases.Single().Disease;
        disease.ConditionType = condition;
        disease.IsContentApproved = approved;
        disease.Medication = "Medication must not be shown";
        var result = await _predictionService.PredictAsync(CreateFile(), null);
        result.PredictedPlantDisease.Disease.IsContentApproved.Should().Be(approved);
        result.PredictedPlantDisease.Disease.ConditionType.Should().Be(condition);
        result.Medication.Should().BeNull();
        if (!approved) result.PredictedPlantDisease.Disease.Description.Should().Be("Thông tin đang được cập nhật");
    }

    [Fact]
    public async Task Snapshot_ShouldKeepOriginalLabelsAndHideExpiredImages()
    {
        ConfigureHealthyClass();
        var owner = Guid.NewGuid();
        var result = await _predictionService.PredictAsync(CreateFile(), owner);
        var entity = _predictionRepository.AddedPredictions.Single();
        _plantDiseaseRepository.PlantDiseases.Single().Plant.Name = "Changed later";
        entity.Images.Single().ExpiresAt = DateTime.UtcNow.AddSeconds(-1);

        var stored = await _predictionService.GetPredictionByIdAsync(result.Id, userId: owner);
        stored!.PredictedPlantDisease.Plant.Name.Should().Be("Tomato");
        stored.ImagePath.Should().BeEmpty();
        stored.Images.Single().IsExpired.Should().BeTrue();
        stored.Images.Single().ImagePath.Should().BeNull();
        entity.ResultSnapshotJson.Should().NotBeNull();
        (await _predictionService.GetPredictionByIdAsync(result.Id, userId: Guid.NewGuid())).Should().BeNull();
    }

    [Theory]
    [InlineData(0.8f, true)]
    [InlineData(0.81f, false)]
    public async Task ConfidenceBoundary_ShouldControlWarning_WithoutUsingUnverifiedLegacyMedication(float confidence, bool warning)
    {
        ConfigureHealthyClass();
        var disease = _plantDiseaseRepository.PlantDiseases.Single().Disease;
        disease.ConditionType = "Disease";
        disease.IsContentApproved = true;
        disease.Medication = "Reviewed medication";
        _diseasePredictor.Result = new(0, "Tomato___Healthy", confidence, []);
        var result = await _predictionService.PredictAsync(CreateFile(), null);
        (result.Warning != null).Should().Be(warning);
        result.Medication.Should().BeNull("legacy disease text alone is not a verified medicine use");
    }

    [Fact]
    public async Task GetFilteredHistoryAsync_ShouldFilterByPlantAndDisease()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var plant1Id = Guid.NewGuid();
        var plant2Id = Guid.NewGuid();
        var diseaseId = Guid.NewGuid();

        var pd1 = new PlantDisease
        {
            Id = Guid.NewGuid(),
            PlantId = plant1Id,
            DiseaseId = diseaseId,
            Plant = new Plant { Id = plant1Id, Name = "Rice", VietnameseName = "Lúa" },
            Disease = new Disease { Id = diseaseId, Name = "Blast", VietnameseName = "Đạo ôn" }
        };
        var pd2 = new PlantDisease
        {
            Id = Guid.NewGuid(),
            PlantId = plant2Id,
            DiseaseId = diseaseId,
            Plant = new Plant { Id = plant2Id, Name = "Corn", VietnameseName = "Ngô" },
            Disease = new Disease { Id = diseaseId, Name = "Blast", VietnameseName = "Đạo ôn" }
        };

        _predictionRepository.AddedPredictions.Add(new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PredictedPlantDisease = pd1,
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        });
        _predictionRepository.AddedPredictions.Add(new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PredictedPlantDisease = pd2,
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        });

        var filter = new PredictionFilterParams(PlantId: plant1Id, DiseaseId: diseaseId);

        // Act
        var result = await _predictionService.GetFilteredHistoryAsync(userId, filter);

        // Assert
        result.TotalCount.Should().Be(1);
        result.Items.Should().HaveCount(1);
        result.Items.First().PlantName.Should().Be("Rice");
    }

    [Fact]
    public async Task GetFilteredHistoryAsync_ShouldFilterByDateRange()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var pd = new PlantDisease
        {
            Id = Guid.NewGuid(),
            Plant = new Plant { Name = "Rice" },
            Disease = new Disease { Name = "Healthy" }
        };

        var now = DateTime.UtcNow;
        _predictionRepository.AddedPredictions.Add(new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PredictedPlantDisease = pd,
            CreatedAt = now.AddDays(-10)
        });
        _predictionRepository.AddedPredictions.Add(new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PredictedPlantDisease = pd,
            CreatedAt = now.AddDays(-2)
        });

        var filter = new PredictionFilterParams(FromDate: now.AddDays(-5), ToDate: now);

        // Act
        var result = await _predictionService.GetFilteredHistoryAsync(userId, filter);

        // Assert
        result.TotalCount.Should().Be(1);
        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetFilteredHistoryAsync_ShouldThrowArgumentException_WhenFromDateGreaterThanToDate()
    {
        var userId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var filter = new PredictionFilterParams(FromDate: now.AddDays(5), ToDate: now);

        var act = () => _predictionService.GetFilteredHistoryAsync(userId, filter);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Từ ngày không được lớn hơn đến ngày*");
    }

    [Fact]
    public async Task LegacyHistory_ShouldReturnTopKInSavedRankOrder()
    {
        ConfigureHealthyClass();
        var primary = _plantDiseaseRepository.PlantDiseases.Single();
        var alternative = new PlantDisease
        {
            ClassIndex = 1, ClassName = "Tomato___Disease", Plant = primary.Plant,
            Disease = new Disease { Name = "Disease" }
        };
        var owner = Guid.NewGuid();
        var prediction = new Prediction
        {
            UserId = owner, PredictedPlantDisease = primary, Confidence = 0.9,
            // Collection/database enumeration order must not replace the persisted rank.
            PredictionDetails =
            [
                new() { Rank = 2, Probability = 0.1, PlantDisease = alternative },
                new() { Rank = 1, Probability = 0.9, PlantDisease = primary }
            ]
        };
        _predictionRepository.AddedPredictions.Add(prediction);

        var result = await _predictionService.GetPredictionByIdAsync(prediction.Id, userId: owner);

        result!.HasHistoricalSnapshot.Should().BeFalse();
        result.PredictionDetails.Select(item => item.ClassIndex).Should().Equal(0, 1);
        result.PredictionDetails.Select(item => item.Confidence).Should().Equal(0.9, 0.1);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UploadFailure_ShouldNotPersistHistory_AndShouldDisposeStreams(bool cancelled)
    {
        ConfigureHealthyClass();
        _imageStorage.UploadError = cancelled
            ? new OperationCanceledException("Upload cancelled.")
            : new IOException("Upload failed.");

        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());

        (await act.Should().ThrowAsync<Exception>()).Which.Should().BeSameAs(_imageStorage.UploadError);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        var context = _imageStorage.UploadContext!;
        _imageStorage.DeletedPublicIds.Should().Equal($"users/{context.UserId}/predictions/{context.PredictionId}/{context.ImageId}.jpg");
        _imageStorage.CleanupToken.IsCancellationRequested.Should().BeFalse();
        _journal.Verify(journal => journal.CompleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never,
            "an unacknowledged upload must retain its journal entry for delayed reconciliation");
        _imageStorage.ReceivedStream!.CanRead.Should().BeFalse();
        _diseasePredictor.ReceivedStream!.CanRead.Should().BeFalse();
    }

    [Fact]
    public async Task CancelledDatabaseWrite_ShouldCleanUploadedImage_UsingAnUncancelledToken()
    {
        ConfigureHealthyClass();
        using var cancellation = new CancellationTokenSource();
        _imageStorage.AfterUpload = cancellation.Cancel;
        var writeError = new OperationCanceledException(cancellation.Token);
        _predictionRepository.WriteError = writeError;

        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid(), cancellationToken: cancellation.Token);

        (await act.Should().ThrowAsync<OperationCanceledException>()).Which.Should().BeSameAs(writeError);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.DeletedPublicIds.Should().Equal("r2/predictions/leaf.jpg");
        _imageStorage.CleanupToken.IsCancellationRequested.Should().BeFalse();
    }

    [Fact]
    public async Task FailedImageCleanup_ShouldPreserveDatabaseFailure_WhenStorageReturnsFalse()
    {
        ConfigureHealthyClass();
        var writeError = new IOException("Database unavailable.");
        _predictionRepository.WriteError = writeError;
        _imageStorage.DeleteResult = false;

        var act = () => _predictionService.PredictAsync(CreateFile(), Guid.NewGuid());

        (await act.Should().ThrowAsync<IOException>()).Which.Should().BeSameAs(writeError);
        _predictionRepository.AddedPredictions.Should().BeEmpty();
        _imageStorage.DeletedPublicIds.Should().Equal("r2/predictions/leaf.jpg");
        _journal.Verify(journal => journal.CompleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(31)]
    public async Task LegacyHistoryWithoutImageRows_ShouldHideUnverifiedImageAndRetainHistory(int ageDays)
    {
        ConfigureHealthyClass();
        var owner = Guid.NewGuid();
        var prediction = new Prediction
        {
            UserId = owner, PredictedPlantDisease = _plantDiseaseRepository.PlantDiseases.Single(),
            CreatedAt = DateTime.UtcNow.AddDays(-ageDays), Confidence = 0.9,
            ImagePath = "https://images.test/legacy.jpg", ImagePublicId = "legacy/image"
        };
        _predictionRepository.AddedPredictions.Add(prediction);

        var detail = await _predictionService.GetPredictionByIdAsync(prediction.Id, userId: owner);
        var history = await _predictionService.GetPredictionHistoryAsync(owner);

        detail!.ImagePath.Should().BeEmpty("legacy URLs without owned image metadata cannot bypass private image access");
        detail.ImagePublicId.Should().BeNull();
        detail.HasHistoricalSnapshot.Should().BeFalse();
        detail.Images.Should().BeEmpty();
        history.TotalCount.Should().Be(1);
        history.Items.Should().ContainSingle().Which.ImagePath.Should().Be(detail.ImagePath);
        prediction.ImagePath.Should().Be("https://images.test/legacy.jpg", "reading history does not delete stored metadata");
    }

    private void ConfigureHealthyClass() => _plantDiseaseRepository.PlantDiseases =
    [new PlantDisease { ClassIndex = 0, ClassName = "Tomato___Healthy", Plant = new Plant { Name = "Tomato" }, Disease = new Disease { Name = "Healthy" } }];

    private static FormFile CreateFile()
    {
        var bytes = Encoding.UTF8.GetBytes("test bytes");
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "leaf.jpg");
    }

    private static byte[] ReadAllBytes(Stream stream)
    {
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    [Fact]
    public async Task LegacyImages_AreHiddenUntilMigrated_WithoutChangingStoredHistory()
    {
        ConfigureHealthyClass();
        var owner = Guid.NewGuid();
        var result = await _predictionService.PredictAsync(CreateFile(), owner);
        var entity = _predictionRepository.AddedPredictions.Single();
        entity.ImagePath = "https://legacy.example/public.jpg";
        entity.ImagePublicId = "legacy/image";
        entity.Images.Single().ImagePath = entity.ImagePath;
        entity.Images.Single().ImagePublicId = entity.ImagePublicId;
        var stored = await _predictionService.GetPredictionByIdAsync(result.Id, userId: owner);
        stored!.ImagePath.Should().BeEmpty();
        stored.Images.Single().ImagePath.Should().BeNull();
        entity.ImagePath.Should().Be("https://legacy.example/public.jpg");
    }

    [Fact]
    public async Task ReadImage_RequiresOwnerAndLiveImage_AndDoesNotReadOtherKeys()
    {
        ConfigureHealthyClass();
        var userId = Guid.NewGuid();
        var result = await _predictionService.PredictAsync(CreateFile(), userId);
        var image = result.Images.Single();
        (await _predictionService.ReadImageAsync(result.Id, image.Id, Guid.NewGuid())).Should().BeNull();
        (await _predictionService.ReadImageAsync(result.Id, Guid.NewGuid(), userId)).Should().BeNull();
        _imageStorage.ReadCount.Should().Be(0);
        (await _predictionService.ReadImageAsync(result.Id, image.Id, userId))!.Content.Should().Equal(1, 2);
        _imageStorage.ReadCount.Should().Be(1);
        var entity = _predictionRepository.AddedPredictions.Single().Images.Single();
        entity.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        (await _predictionService.ReadImageAsync(result.Id, image.Id, userId)).Should().BeNull();
        entity.ExpiresAt = DateTime.UtcNow.AddDays(1);
        entity.DeletedAt = DateTime.UtcNow;
        (await _predictionService.ReadImageAsync(result.Id, image.Id, userId)).Should().BeNull();
        entity.DeletedAt = null;
        entity.ImagePublicId = "local_old.png";
        (await _predictionService.ReadImageAsync(result.Id, image.Id, userId)).Should().BeNull();
        _imageStorage.ReadCount.Should().Be(1);
    }

    [Fact]
    public async Task NewKeys_RequireMatchingMetadata_ForReadProjectionAndDelete()
    {
        ConfigureHealthyClass();
        var owner = Guid.NewGuid();
        var result = await _predictionService.PredictAsync(CreateFile(), owner);
        var entity = _predictionRepository.AddedPredictions.Single();
        var image = entity.Images.Single();
        var key = $"users/{owner:D}/predictions/{entity.Id:D}/{image.Id:D}.png";
        image.ImagePublicId = entity.ImagePublicId = key;
        (await _predictionService.ReadImageAsync(entity.Id, image.Id, owner)).Should().NotBeNull();
        (await _predictionService.GetPredictionByIdAsync(entity.Id, userId: owner))!.Images.Single().ImagePath.Should().NotBeNull();
        image.ImagePublicId = $"users/{Guid.NewGuid():D}/predictions/{entity.Id:D}/{image.Id:D}.png";
        (await _predictionService.ReadImageAsync(entity.Id, image.Id, owner)).Should().BeNull();
        (await _predictionService.GetPredictionByIdAsync(entity.Id, userId: owner))!.Images.Single().ImagePath.Should().BeNull();
        await FluentActions.Invoking(() => _predictionService.DeletePredictionAsync(entity.Id, owner, false)).Should().ThrowAsync<InvalidOperationException>();
        _imageStorage.DeletedPublicIds.Should().BeEmpty();
        image.ImagePublicId = key;
        entity.ImagePublicId = $"users/{Guid.NewGuid():D}/predictions/{entity.Id:D}/{image.Id:D}.png";
        await FluentActions.Invoking(() => _predictionService.DeletePredictionAsync(entity.Id, owner, false)).Should().ThrowAsync<InvalidOperationException>();
        _imageStorage.DeletedPublicIds.Should().BeEmpty();
        entity.ImagePublicId = key;
        await _predictionService.DeletePredictionAsync(entity.Id, owner, false);
        _imageStorage.DeletedPublicIds.Should().ContainSingle().Which.Should().Be(key);
    }

    private sealed class RecordingPredictionRepository : IPredictionRepository
    {
        public Exception? WriteError { get; set; }
        public List<Prediction> AddedPredictions { get; } = [];

        public Task<Prediction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(AddedPredictions.SingleOrDefault(prediction => prediction.Id == id));

        public Task<IEnumerable<Prediction>> GetByUserIdAsync(
            Guid userId,
            int pageNumber = 1,
            int pageSize = 10,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(AddedPredictions.Where(prediction => prediction.UserId == userId));

        public Task<int> GetCountByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(AddedPredictions.Count(prediction => prediction.UserId == userId));

        public Task<(IEnumerable<Prediction> Items, int TotalCount)> GetFilteredByUserIdAsync(
            Guid userId,
            PredictionFilterParams filterParams,
            CancellationToken cancellationToken = default)
        {
            var query = AddedPredictions.Where(p => p.UserId == userId);
            if (filterParams.AgriculturalProfileId.HasValue)
                query = query.Where(p => p.AgriculturalProfileId == filterParams.AgriculturalProfileId.Value);
            if (filterParams.PlantId.HasValue)
                query = query.Where(p => p.PredictedPlantDisease?.PlantId == filterParams.PlantId.Value);
            if (filterParams.DiseaseId.HasValue)
                query = query.Where(p => p.PredictedPlantDisease?.DiseaseId == filterParams.DiseaseId.Value);
            if (filterParams.FromDate.HasValue)
                query = query.Where(p => p.CreatedAt >= filterParams.FromDate.Value);
            if (filterParams.ToDate.HasValue)
                query = query.Where(p => p.CreatedAt <= filterParams.ToDate.Value);

            var total = query.Count();
            var page = filterParams.PageNumber < 1 ? 1 : filterParams.PageNumber;
            var size = filterParams.PageSize < 1 ? 10 : filterParams.PageSize;
            var items = query
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Skip((page - 1) * size)
                .Take(size)
                .ToList();

            return Task.FromResult<(IEnumerable<Prediction>, int)>((items, total));
        }

        public Task AddAsync(Prediction prediction, CancellationToken cancellationToken = default)
        {
            if (WriteError != null) throw WriteError;
            AddedPredictions.Add(prediction);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(Prediction prediction, CancellationToken cancellationToken = default)
        {
            AddedPredictions.Remove(prediction);
            return Task.CompletedTask;
        }
    }

    private sealed class StubPlantDiseaseRepository : IPlantDiseaseRepository
    {
        public IReadOnlyCollection<PlantDisease> PlantDiseases { get; set; } = [];

        public Task<(IReadOnlyList<PlantDisease> Items, int Total)> SearchAsync(
            AgriVision.Application.DTOs.Knowledge.CatalogFilterParams filter,
            bool publicOnly,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<PlantDisease?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(PlantDiseases.SingleOrDefault(item => item.Id == id));

        public Task<PlantDisease?> GetByClassIndexAsync(
            int classIndex,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(PlantDiseases.SingleOrDefault(item => item.ClassIndex == classIndex));

        public Task<PlantDisease?> GetByClassNameAsync(
            string className,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(PlantDiseases.SingleOrDefault(item => item.ClassName == className));

        public Task<IEnumerable<PlantDisease>> GetAllAsync(
            bool includeInactive = false,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(PlantDiseases.AsEnumerable());

        public Task<IEnumerable<PlantDisease>> GetByPlantIdAsync(
            Guid plantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(PlantDiseases.Where(item => item.PlantId == plantId));

        public Task AddAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task UpdateAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task DeleteAsync(PlantDisease plantDisease, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }

    private sealed class RecordingImageStorage : IImageStorage
    {
        public Exception? UploadError { get; set; }
        public Exception? DeleteError { get; set; }
        public bool DeleteResult { get; set; } = true;
        public Action? AfterUpload { get; set; }
        public CancellationToken CleanupToken { get; private set; }
        public List<string> DeletedPublicIds { get; } = [];
        public ImageUploadResult UploadResult { get; set; } =
            new("r2/predictions/leaf.jpg", string.Empty);

        public int ReadCount { get; private set; }
        public Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default)
        {
            ReadCount++;
            return Task.FromResult<ImageDownloadResult?>(new([1, 2], "image/jpeg"));
        }

        public int UploadCount { get; private set; }
        public ImageStorageContext? UploadContext { get; private set; }
        public Stream? ReceivedStream { get; private set; }
        public byte[]? UploadedImageBytes { get; private set; }

        public Task<ImageUploadResult> UploadImageAsync(
            IFormFile file,
            ImageStorageContext context, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ImageUploadResult> UploadImageAsync(
            Stream imageStream,
            string fileName,
            ImageStorageContext context, CancellationToken cancellationToken = default)
        {
            UploadCount++;
            UploadContext = context;
            ReceivedStream = imageStream;
            UploadedImageBytes = ReadAllBytes(imageStream);
            if (UploadError != null) throw UploadError;
            AfterUpload?.Invoke();
            return Task.FromResult(UploadResult);
        }

        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
        {
            CleanupToken = cancellationToken;
            if (DeleteError != null) throw DeleteError;
            DeletedPublicIds.Add(publicId);
            return Task.FromResult(DeleteResult);
        }
    }

    private sealed class RecordingPlantDiseasePredictor : IPlantDiseasePredictor
    {
        public Exception? Error { get; set; }
        public AiPredictionResult Result { get; set; } =
            new(0, "Tomato___Healthy", 1, []);

        public int PredictCount { get; private set; }
        public Stream? ReceivedStream { get; private set; }
        public byte[]? PredictedImageBytes { get; private set; }

        public Task<AiPredictionResult> PredictAsync(
            IFormFile file,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<AiPredictionResult> PredictAsync(
            Stream imageStream,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            PredictCount++;
            ReceivedStream = imageStream;
            PredictedImageBytes = ReadAllBytes(imageStream);
            if (Error != null) throw Error;
            return Task.FromResult(Result);
        }
    }
}
