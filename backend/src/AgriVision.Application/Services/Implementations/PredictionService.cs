using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.DTOs.Plant;
using AgriVision.Application.DTOs.PlantDisease;
using AgriVision.Application.DTOs.Prediction;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Services.Implementations;

public class PredictionService : IPredictionService
{
    private readonly IPredictionRepository _predictionRepository;
    private readonly IPlantDiseaseRepository _plantDiseaseRepository;
    private readonly IImageStorage _imageStorage;
    private readonly IPlantDiseasePredictor _diseasePredictor;

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

    public PredictionService(
        IPredictionRepository predictionRepository,
        IPlantDiseaseRepository plantDiseaseRepository,
        IImageStorage imageStorage,
        IPlantDiseasePredictor diseasePredictor)
    {
        _predictionRepository = predictionRepository;
        _plantDiseaseRepository = plantDiseaseRepository;
        _imageStorage = imageStorage;
        _diseasePredictor = diseasePredictor;
    }

    public async Task<PredictionResultDto> PredictAsync(IFormFile file, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No image file uploaded.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"Invalid file extension '{extension}'. Allowed extensions are: {string.Join(", ", AllowedExtensions)}");
        }

        // 1. Upload image to Cloudinary / Local storage
        var uploadResult = await _imageStorage.UploadImageAsync(file, cancellationToken);

        // 2. Call AI prediction service
        using var stream = file.OpenReadStream();
        var aiResult = await _diseasePredictor.PredictAsync(stream, file.FileName, cancellationToken);

        // 3. Find matching PlantDisease in database
        var primaryPlantDisease = await _plantDiseaseRepository.GetByClassIndexAsync(aiResult.ClassIndex, cancellationToken)
            ?? await _plantDiseaseRepository.GetByClassNameAsync(aiResult.ClassName, cancellationToken);

        if (primaryPlantDisease == null)
        {
            // Fallback: pick the first available plant disease or throw
            var all = await _plantDiseaseRepository.GetAllAsync(cancellationToken: cancellationToken);
            primaryPlantDisease = all.FirstOrDefault() 
                ?? throw new InvalidOperationException($"No plant disease records found in database for class index '{aiResult.ClassIndex}'.");
        }

        // 4. Create Prediction domain entity
        var prediction = new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ImagePath = uploadResult.SecureUrl,
            ImagePublicId = uploadResult.PublicId,
            PredictedPlantDiseaseId = primaryPlantDisease.Id,
            Confidence = aiResult.Confidence,
            CreatedAt = DateTime.UtcNow
        };

        // 5. Add prediction details (Top-K)
        int rank = 1;
        foreach (var topItem in aiResult.TopK)
        {
            var pdItem = await _plantDiseaseRepository.GetByClassIndexAsync(topItem.ClassIndex, cancellationToken)
                ?? await _plantDiseaseRepository.GetByClassNameAsync(topItem.ClassName, cancellationToken)
                ?? primaryPlantDisease;

            prediction.PredictionDetails.Add(new PredictionDetail
            {
                Id = Guid.NewGuid(),
                PredictionId = prediction.Id,
                PlantDiseaseId = pdItem.Id,
                Probability = topItem.Confidence,
                Rank = rank++
            });
        }

        await _predictionRepository.AddAsync(prediction, cancellationToken);

        return MapToResultDto(prediction, primaryPlantDisease);
    }

    public async Task<PredictionResultDto?> GetPredictionByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var prediction = await _predictionRepository.GetByIdAsync(id, cancellationToken);
        if (prediction == null)
        {
            return null;
        }

        return MapToResultDto(prediction, prediction.PredictedPlantDisease);
    }

    public async Task<PagedResult<PredictionHistoryDto>> GetPredictionHistoryAsync(Guid userId, int pageNumber = 1, int pageSize = 10, CancellationToken cancellationToken = default)
    {
        var totalCount = await _predictionRepository.GetCountByUserIdAsync(userId, cancellationToken);
        var predictions = await _predictionRepository.GetByUserIdAsync(userId, pageNumber, pageSize, cancellationToken);

        var historyItems = predictions.Select(p => new PredictionHistoryDto(
            p.Id,
            p.ImagePath,
            p.PredictedPlantDisease.Plant?.Name ?? "Unknown Plant",
            p.PredictedPlantDisease.Plant?.VietnameseName ?? "Chưa xác định",
            p.PredictedPlantDisease.Disease?.Name ?? "Unknown Disease",
            p.PredictedPlantDisease.Disease?.VietnameseName ?? "Chưa xác định",
            p.Confidence,
            p.CreatedAt
        ));

        return new PagedResult<PredictionHistoryDto>(historyItems, pageNumber, pageSize, totalCount);
    }

    public async Task DeletePredictionAsync(Guid id, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var prediction = await _predictionRepository.GetByIdAsync(id, cancellationToken);
        if (prediction == null)
        {
            throw new KeyNotFoundException($"Prediction with ID '{id}' not found.");
        }

        if (!isAdmin && prediction.UserId != userId)
        {
            throw new UnauthorizedAccessException("You are not authorized to delete this prediction history record.");
        }

        if (!string.IsNullOrEmpty(prediction.ImagePublicId))
        {
            await _imageStorage.DeleteImageAsync(prediction.ImagePublicId, cancellationToken);
        }

        await _predictionRepository.DeleteAsync(prediction, cancellationToken);
    }

    private static PredictionResultDto MapToResultDto(Prediction prediction, PlantDisease primaryPlantDisease)
    {
        var plantDto = primaryPlantDisease.Plant != null
            ? new PlantDto(primaryPlantDisease.Plant.Id, primaryPlantDisease.Plant.Name, primaryPlantDisease.Plant.VietnameseName, primaryPlantDisease.Plant.ScientificName, primaryPlantDisease.Plant.Description, primaryPlantDisease.Plant.IsActive, primaryPlantDisease.Plant.CreatedAt)
            : new PlantDto(Guid.Empty, "Unknown", "Chưa xác định", null, null, true, DateTime.UtcNow);

        var diseaseDto = primaryPlantDisease.Disease != null
            ? new DiseaseDto(primaryPlantDisease.Disease.Id, primaryPlantDisease.Disease.Name, primaryPlantDisease.Disease.VietnameseName, primaryPlantDisease.Disease.Description, primaryPlantDisease.Disease.Symptoms, primaryPlantDisease.Disease.Treatment, primaryPlantDisease.Disease.Prevention, primaryPlantDisease.Disease.IsActive, primaryPlantDisease.Disease.CreatedAt)
            : new DiseaseDto(Guid.Empty, "Unknown", "Chưa xác định", null, null, null, null, true, DateTime.UtcNow);

        var primaryPlantDiseaseDto = new PlantDiseaseDto(
            primaryPlantDisease.Id,
            primaryPlantDisease.PlantId,
            primaryPlantDisease.DiseaseId,
            primaryPlantDisease.ClassName,
            primaryPlantDisease.ClassIndex,
            primaryPlantDisease.IsActive,
            plantDto,
            diseaseDto
        );

        var details = prediction.PredictionDetails.Select(d =>
        {
            var pd = d.PlantDisease ?? primaryPlantDisease;
            var pdPlant = pd.Plant != null ? new PlantDto(pd.Plant.Id, pd.Plant.Name, pd.Plant.VietnameseName, pd.Plant.ScientificName, pd.Plant.Description, pd.Plant.IsActive, pd.Plant.CreatedAt) : plantDto;
            var pdDisease = pd.Disease != null ? new DiseaseDto(pd.Disease.Id, pd.Disease.Name, pd.Disease.VietnameseName, pd.Disease.Description, pd.Disease.Symptoms, pd.Disease.Treatment, pd.Disease.Prevention, pd.Disease.IsActive, pd.Disease.CreatedAt) : diseaseDto;

            var pdDto = new PlantDiseaseDto(pd.Id, pd.PlantId, pd.DiseaseId, pd.ClassName, pd.ClassIndex, pd.IsActive, pdPlant, pdDisease);
            return new PredictionDetailDto(pd.ClassIndex, pd.ClassName, d.Probability, pdDto);
        });

        return new PredictionResultDto(
            prediction.Id,
            prediction.ImagePath,
            prediction.ImagePublicId,
            primaryPlantDiseaseDto,
            prediction.Confidence,
            details,
            prediction.CreatedAt
        );
    }
}
