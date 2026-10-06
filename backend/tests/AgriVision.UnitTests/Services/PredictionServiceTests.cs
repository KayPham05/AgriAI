using System.Text;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace AgriVision.UnitTests.Services;

public class PredictionServiceTests
{
    private readonly RecordingPredictionRepository _predictionRepository;
    private readonly StubPlantDiseaseRepository _plantDiseaseRepository;
    private readonly RecordingImageStorage _imageStorage;
    private readonly RecordingPlantDiseasePredictor _diseasePredictor;
    private readonly PredictionService _predictionService;

    public PredictionServiceTests()
    {
        _predictionRepository = new RecordingPredictionRepository();
        _plantDiseaseRepository = new StubPlantDiseaseRepository();
        _imageStorage = new RecordingImageStorage();
        _diseasePredictor = new RecordingPlantDiseasePredictor();

        _predictionService = new PredictionService(
            _predictionRepository,
            _plantDiseaseRepository,
            _imageStorage,
            _diseasePredictor
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

        var uploadResult = new ImageUploadResult("public_id_123", "http://cloudinary.com/image.jpg");
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
        result.ImagePath.Should().Be("http://cloudinary.com/image.jpg");
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
    public async Task ConfidenceBoundary_ShouldControlWarningAndMedication(float confidence, bool warning)
    {
        ConfigureHealthyClass();
        var disease = _plantDiseaseRepository.PlantDiseases.Single().Disease;
        disease.ConditionType = "Disease";
        disease.IsContentApproved = true;
        disease.Medication = "Reviewed medication";
        _diseasePredictor.Result = new(0, "Tomato___Healthy", confidence, []);
        var result = await _predictionService.PredictAsync(CreateFile(), null);
        (result.Warning != null).Should().Be(warning);
        (result.Medication != null).Should().Be(!warning);
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
        public Exception? DeleteError { get; set; }
        public List<string> DeletedPublicIds { get; } = [];
        public ImageUploadResult UploadResult { get; set; } =
            new("test/image", "https://images.test/leaf.jpg");

        public int UploadCount { get; private set; }
        public Stream? ReceivedStream { get; private set; }
        public byte[]? UploadedImageBytes { get; private set; }

        public Task<ImageUploadResult> UploadImageAsync(
            IFormFile file,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ImageUploadResult> UploadImageAsync(
            Stream imageStream,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            UploadCount++;
            ReceivedStream = imageStream;
            UploadedImageBytes = ReadAllBytes(imageStream);
            return Task.FromResult(UploadResult);
        }

        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
        {
            if (DeleteError != null) throw DeleteError;
            DeletedPublicIds.Add(publicId);
            return Task.FromResult(true);
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
