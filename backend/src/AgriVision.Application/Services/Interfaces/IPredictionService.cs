using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Prediction;
using Microsoft.AspNetCore.Http;

namespace AgriVision.Application.Services.Interfaces;

public interface IPredictionService
{
    Task<PredictionResultDto> PredictAsync(IFormFile file, Guid? userId, CancellationToken cancellationToken = default);
    Task<PredictionResultDto?> GetPredictionByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<PredictionHistoryDto>> GetPredictionHistoryAsync(Guid userId, int pageNumber = 1, int pageSize = 10, CancellationToken cancellationToken = default);
    Task DeletePredictionAsync(Guid id, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default);
}
