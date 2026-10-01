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

        _plantDiseaseRepository.PlantDiseases = [plantDisease];

        // Act
        var result = await _predictionService.PredictAsync(formFile, userId: null);

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
    }

    private static byte[] ReadAllBytes(Stream stream)
    {
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    private sealed class RecordingPredictionRepository : IPredictionRepository
    {
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

        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default) =>
            Task.FromResult(true);
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
