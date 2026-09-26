using System.Text;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;

namespace AgriVision.UnitTests.Services;

public class PredictionServiceTests
{
    private readonly Mock<IPredictionRepository> _predictionRepositoryMock;
    private readonly Mock<IPlantDiseaseRepository> _plantDiseaseRepositoryMock;
    private readonly Mock<IImageStorage> _imageStorageMock;
    private readonly Mock<IPlantDiseasePredictor> _diseasePredictorMock;
    private readonly PredictionService _predictionService;

    public PredictionServiceTests()
    {
        _predictionRepositoryMock = new Mock<IPredictionRepository>();
        _plantDiseaseRepositoryMock = new Mock<IPlantDiseaseRepository>();
        _imageStorageMock = new Mock<IImageStorage>();
        _diseasePredictorMock = new Mock<IPlantDiseasePredictor>();

        _predictionService = new PredictionService(
            _predictionRepositoryMock.Object,
            _plantDiseaseRepositoryMock.Object,
            _imageStorageMock.Object,
            _diseasePredictorMock.Object
        );
    }

    [Fact]
    public async Task PredictAsync_ShouldReturnPredictionResult_WhenImageIsValid()
    {
        // Arrange
        var content = "Fake Image Bytes Content";
        var fileName = "leaf.jpeg";
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
        var formFile = new FormFile(stream, 0, stream.Length, "file", fileName);

        var uploadResult = new ImageUploadResult("public_id_123", "http://cloudinary.com/image.jpg");
        _imageStorageMock.Setup(s => s.UploadImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(uploadResult);

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

        _diseasePredictorMock.Setup(p => p.PredictAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(aiPredictionResult);

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

        _plantDiseaseRepositoryMock.Setup(r => r.GetByClassIndexAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(plantDisease);

        // Act
        var result = await _predictionService.PredictAsync(formFile, userId: null);

        // Assert
        result.Should().NotBeNull();
        result.ImagePath.Should().Be("http://cloudinary.com/image.jpg");
        result.Confidence.Should().Be(0.958f);
        result.PredictedPlantDisease.ClassName.Should().Be("Tomato___Bacterial_spot");
        result.PredictedPlantDisease.Plant.Name.Should().Be("Tomato");
        result.PredictedPlantDisease.Disease.Name.Should().Be("Bacterial spot");

        _predictionRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Once);
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
}
