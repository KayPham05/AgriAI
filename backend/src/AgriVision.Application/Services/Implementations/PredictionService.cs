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
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriVision.Application.Services.Implementations;

public class PredictionService : IPredictionService
{
    private readonly IPredictionRepository _predictionRepository;
    private readonly IPlantDiseaseRepository _plantDiseaseRepository;
    private readonly IImageStorage _imageStorage;
    private readonly IImageUploadJournal _uploadJournal;
    private readonly IPlantDiseasePredictor _diseasePredictor;
    private readonly IAgriculturalProfileRepository _profileRepository;
    private readonly ILogger<PredictionService> _logger;

    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png" };
    private static readonly JsonSerializerOptions SnapshotJsonOptions = new(JsonSerializerDefaults.Web);

    public PredictionService(
        IPredictionRepository predictionRepository,
        IPlantDiseaseRepository plantDiseaseRepository,
        IImageStorage imageStorage,
        IPlantDiseasePredictor diseasePredictor,
        IAgriculturalProfileRepository profileRepository,
        IImageUploadJournal uploadJournal,
        ILogger<PredictionService>? logger = null)
    {
        _predictionRepository = predictionRepository;
        _plantDiseaseRepository = plantDiseaseRepository;
        _imageStorage = imageStorage;
        _uploadJournal = uploadJournal;
        _diseasePredictor = diseasePredictor;
        _profileRepository = profileRepository;
        _logger = logger ?? NullLogger<PredictionService>.Instance;
    }

    public async Task<PredictionResultDto> PredictAsync(IFormFile file, Guid? userId, Guid? agriculturalProfileId = null, CancellationToken cancellationToken = default)
    {
        if (agriculturalProfileId.HasValue)
        {
            if (!userId.HasValue)
                throw new UnauthorizedAccessException("Authentication is required to select an agricultural profile.");
            var profile = await _profileRepository.GetByIdAsync(agriculturalProfileId.Value, cancellationToken);
            if (profile == null || profile.UserId != userId.Value)
                throw new KeyNotFoundException("Agricultural profile not found.");
        }

        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No image file uploaded.");
        }

        if (file.Length > 15 * 1024 * 1024) throw new ArgumentException("Image exceeds 15 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"Invalid file extension '{extension}'. Allowed extensions are: {string.Join(", ", AllowedExtensions)}");
        }

        byte[] imageBytes;
        await using (var requestStream = file.OpenReadStream())
        await using (var buffer = new MemoryStream())
        {
            await requestStream.CopyToAsync(buffer, cancellationToken);
            imageBytes = buffer.ToArray();
        }

        await using var predictionStream = new MemoryStream(imageBytes, writable: false);
        var aiResult = await _diseasePredictor.PredictAsync(predictionStream, file.FileName, cancellationToken);

        // 3. Find matching PlantDisease in database
        var primaryPlantDisease = await _plantDiseaseRepository.GetByClassIndexAsync(aiResult.ClassIndex, cancellationToken);
        if (primaryPlantDisease == null || primaryPlantDisease.ClassName != aiResult.ClassName)
        {
            throw new InvalidOperationException("AI class index/name does not match the database catalog.");
        }

        // Guests receive the result without storing images or personal history.
        var uploadResult = new ImageUploadResult(string.Empty, string.Empty);

        // 4. Create Prediction domain entity
        var prediction = new Prediction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AgriculturalProfileId = agriculturalProfileId,
            PredictedPlantDiseaseId = primaryPlantDisease.Id,
            Confidence = aiResult.Confidence,
            CreatedAt = DateTime.UtcNow
        };

        // 5. Add prediction details (Top-K)
        int rank = 1;
        foreach (var topItem in aiResult.TopK)
        {
            var pdItem = await _plantDiseaseRepository.GetByClassIndexAsync(topItem.ClassIndex, cancellationToken);
            if (pdItem == null || pdItem.ClassName != topItem.ClassName)
                throw new InvalidOperationException("AI top-k class index/name does not match the database catalog.");

            prediction.PredictionDetails.Add(new PredictionDetail
            {
                Id = Guid.NewGuid(),
                PredictionId = prediction.Id,
                PlantDiseaseId = pdItem.Id,
                PlantDisease = pdItem,
                Probability = topItem.Confidence,
                Rank = rank++
            });
        }

        string? pendingKey = null;
        var persisted = false;
        var uploadAcknowledged = false;
        try
        {
            if (userId.HasValue)
            {
                var image = new PredictionImage
                {
                    PredictionId = prediction.Id, Position = 0,
                    Confidence = prediction.Confidence, UploadedAt = prediction.CreatedAt,
                    ExpiresAt = prediction.CreatedAt.AddDays(30)
                };
                var context = new ImageStorageContext(userId.Value, prediction.Id, image.Id);
                var key = ImageStorageKey.Create(context, extension);
                await _uploadJournal.ReserveAsync(context, key, cancellationToken);
                pendingKey = key;
                await using var storageStream = new MemoryStream(imageBytes, writable: false);
                uploadResult = await _imageStorage.UploadImageAsync(storageStream, file.FileName, context, cancellationToken);
                uploadAcknowledged = true;
                pendingKey = uploadResult.PublicId;
                prediction.ImagePublicId = image.ImagePublicId = uploadResult.PublicId;
                image.ImagePath = $"/api/predictions/{prediction.Id}/images/{image.Id}";
                prediction.ImagePath = image.ImagePath;
                prediction.Images.Add(image);
            }

            var result = MapToResultDto(prediction, primaryPlantDisease) with { HasHistoricalSnapshot = userId.HasValue };
            prediction.ResultSnapshotJson = JsonSerializer.Serialize(result, SnapshotJsonOptions);
            if (userId.HasValue)
            {
                await _predictionRepository.AddAsync(prediction, cancellationToken);
                persisted = true;
            }
            return result;
        }
        finally
        {
            if (pendingKey != null)
            {
                using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                try
                {
                    if (!persisted) persisted = await _predictionRepository.GetByIdAsync(prediction.Id, cleanup.Token) != null;
                    var deleted = !persisted && await _imageStorage.DeleteImageAsync(pendingKey, cleanup.Token);
                    // An unacknowledged PUT may finish after DELETE; keep the intent for delayed reconciliation.
                    if (persisted || (deleted && uploadAcknowledged))
                        await _uploadJournal.CompleteAsync(pendingKey, cleanup.Token);
                    else _logger.LogWarning("Image cleanup remains pending for {Key}.", pendingKey);
                }
                catch (Exception error)
                {
                    _logger.LogError(error, "Image cleanup remains pending for {Key}.", pendingKey);
                }
            }
        }
    }

    public async Task<PredictionResultDto?> GetPredictionByIdAsync(Guid id, CancellationToken cancellationToken = default, Guid? userId = null)
    {
        var prediction = await _predictionRepository.GetByIdAsync(id, cancellationToken);
        if (prediction == null || !userId.HasValue || prediction.UserId != userId)
        {
            return null;
        }

        return ReadStoredResult(prediction);
    }

    public async Task<PagedResult<PredictionHistoryDto>> GetPredictionHistoryAsync(Guid userId, int pageNumber = 1, int pageSize = 10, CancellationToken cancellationToken = default)
    {
        return await GetFilteredHistoryAsync(userId, new PredictionFilterParams(null, null, null, null, null, pageNumber, pageSize), cancellationToken);
    }

    public async Task<PagedResult<PredictionHistoryDto>> GetFilteredHistoryAsync(Guid userId, PredictionFilterParams filterParams, CancellationToken cancellationToken = default)
    {
        if (filterParams.PageNumber < 1 || filterParams.PageSize < 1)
        {
            throw new ArgumentException("Page number and page size must be positive.");
        }

        if (filterParams.FromDate.HasValue && filterParams.ToDate.HasValue && filterParams.FromDate.Value > filterParams.ToDate.Value)
        {
            throw new ArgumentException("Từ ngày không được lớn hơn đến ngày.");
        }

        var (predictions, totalCount) = await _predictionRepository.GetFilteredByUserIdAsync(userId, filterParams, cancellationToken);

        var historyItems = predictions.Select(p =>
        {
            var stored = ReadStoredResult(p);
            return new PredictionHistoryDto(p.Id, stored.ImagePath,
                stored.PredictedPlantDisease.Plant.Name, stored.PredictedPlantDisease.Plant.VietnameseName ?? "Chưa xác định",
                stored.PredictedPlantDisease.Disease.Name, stored.PredictedPlantDisease.Disease.VietnameseName ?? "Chưa xác định",
                stored.Confidence, p.CreatedAt)
            { HasHistoricalSnapshot = stored.HasHistoricalSnapshot, Images = stored.Images, AgriculturalProfileId = p.AgriculturalProfileId };
        }).ToList();

        return new PagedResult<PredictionHistoryDto>(historyItems, filterParams.PageNumber, filterParams.PageSize, totalCount);
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

        foreach (var image in prediction.Images.Where(image => image.DeletedAt == null))
        {
            if (!prediction.UserId.HasValue || !ImageStorageKey.Matches(image.ImagePublicId,
                new ImageStorageContext(prediction.UserId.Value, prediction.Id, image.Id)))
                throw new InvalidOperationException("Image storage key does not match its metadata.");
        }

        if (!string.IsNullOrEmpty(prediction.ImagePublicId) &&
            !prediction.Images.Any(image => image.ImagePublicId == prediction.ImagePublicId))
            throw new InvalidOperationException("Primary image storage key does not match its metadata.");

        var publicIds = prediction.Images.Where(image => image.DeletedAt == null)
            .Select(image => image.ImagePublicId).Append(prediction.ImagePublicId)
            .Where(publicId => !string.IsNullOrEmpty(publicId)).Distinct();
        foreach (var publicId in publicIds)
        {
            if (!await _imageStorage.DeleteImageAsync(publicId!, cancellationToken))
                throw new InvalidOperationException("Image deletion failed; the history record has been retained.");
        }

        await _predictionRepository.DeleteAsync(prediction, cancellationToken);
    }

    public async Task<ImageDownloadResult?> ReadImageAsync(Guid id, Guid imageId, Guid userId, CancellationToken cancellationToken = default)
    {
        var prediction = await _predictionRepository.GetByIdAsync(id, cancellationToken);
        if (prediction == null || prediction.UserId != userId) return null;
        var image = prediction.Images.SingleOrDefault(item => item.Id == imageId);
        if (image == null || image.DeletedAt.HasValue || image.ExpiresAt <= DateTime.UtcNow ||
            string.IsNullOrEmpty(image.ImagePublicId) || !ImageStorageKey.Matches(image.ImagePublicId, new ImageStorageContext(userId, id, imageId)))
            return null;
        return await _imageStorage.ReadImageAsync(image.ImagePublicId, cancellationToken);
    }

    private static PredictionResultDto MapToResultDto(Prediction prediction, PlantDisease primaryPlantDisease)
    {
        var plantDto = primaryPlantDisease.Plant != null
            ? new PlantDto(primaryPlantDisease.Plant.Id, primaryPlantDisease.Plant.Name, primaryPlantDisease.Plant.VietnameseName, primaryPlantDisease.Plant.ScientificName, primaryPlantDisease.Plant.Description, primaryPlantDisease.Plant.IsActive, primaryPlantDisease.Plant.CreatedAt)
            : new PlantDto(Guid.Empty, "Unknown", "Chưa xác định", null, null, true, DateTime.UtcNow);

        var disease = primaryPlantDisease.Disease;
        var approved = disease?.IsContentApproved == true;
        const string pending = "Thông tin đang được cập nhật";
        var diseaseDto = disease != null
            ? new DiseaseDto(disease.Id, disease.Name, disease.VietnameseName,
                approved ? disease.Description ?? pending : pending,
                approved ? disease.Symptoms ?? pending : pending,
                approved ? disease.Treatment ?? pending : pending,
                approved ? disease.Prevention ?? pending : pending, disease.IsActive, disease.CreatedAt)
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
            var pdDisease = pd.Disease != null ? new DiseaseDto(pd.Disease.Id, pd.Disease.Name, pd.Disease.VietnameseName,
                pd.Disease.IsContentApproved ? pd.Disease.Description ?? pending : pending,
                pd.Disease.IsContentApproved ? pd.Disease.Symptoms ?? pending : pending,
                pd.Disease.IsContentApproved ? pd.Disease.Treatment ?? pending : pending,
                pd.Disease.IsContentApproved ? pd.Disease.Prevention ?? pending : pending,
                pd.Disease.IsActive, pd.Disease.CreatedAt) : diseaseDto;

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
        )
        {
            AgriculturalProfileId = prediction.AgriculturalProfileId,
            Images = ProjectImages(prediction),
            Warning = prediction.Confidence <= 0.8f ? "Độ tin cậy thấp; cần kiểm tra lại kết quả." : null,
            InformationPending = !approved,
            Medication = approved && prediction.Confidence > 0.8f && disease?.ConditionType == "Disease"
                ? disease.Medication : null
        };
    }

    private static IReadOnlyList<PredictionImageDto> ProjectImages(Prediction prediction) =>
        prediction.Images.OrderBy(image => image.Position).Select(image =>
        {
            var expired = image.DeletedAt.HasValue || image.ExpiresAt <= DateTime.UtcNow;
            var readable = !expired && prediction.UserId.HasValue && ImageStorageKey.Matches(image.ImagePublicId, new ImageStorageContext(prediction.UserId.Value, prediction.Id, image.Id));
            return new PredictionImageDto(image.Id, readable ? $"/api/predictions/{prediction.Id}/images/{image.Id}" : null,
                image.Confidence, image.ExpiresAt, expired);
        }).ToList();

    private static PredictionResultDto ReadStoredResult(Prediction prediction)
    {
        var result = prediction.ResultSnapshotJson == null
            ? MapToResultDto(prediction, prediction.PredictedPlantDisease)
            : JsonSerializer.Deserialize<PredictionResultDto>(prediction.ResultSnapshotJson, SnapshotJsonOptions)
                ?? throw new InvalidOperationException("The stored prediction snapshot is invalid.");
        var images = ProjectImages(prediction);
        var expired = images.Count > 0 ? images[0].IsExpired : prediction.CreatedAt.AddDays(30) <= DateTime.UtcNow;
        return result with
        {
            // Grouping is live metadata; deletion must not restore a stale link from the immutable snapshot.
            AgriculturalProfileId = prediction.AgriculturalProfileId,
            Images = images,
            ImagePath = images.FirstOrDefault()?.ImagePath ?? string.Empty,
            ImagePublicId = expired || images.FirstOrDefault()?.ImagePath == null ? null : prediction.ImagePublicId,
            HasHistoricalSnapshot = prediction.ResultSnapshotJson != null
        };
    }
}
