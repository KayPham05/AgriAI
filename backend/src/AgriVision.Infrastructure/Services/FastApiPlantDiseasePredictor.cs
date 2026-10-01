using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AgriVision.Application.Common.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Services;

public class FastApiPlantDiseasePredictor : IPlantDiseasePredictor
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FastApiPlantDiseasePredictor> _logger;

    public FastApiPlantDiseasePredictor(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<FastApiPlantDiseasePredictor> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var baseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    public async Task<AiPredictionResult> PredictAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        using var stream = file.OpenReadStream();
        return await PredictAsync(stream, file.FileName, cancellationToken);
    }

    public async Task<AiPredictionResult> PredictAsync(Stream imageStream, string fileName, CancellationToken cancellationToken = default)
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StreamContent(imageStream), "file", fileName);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync("/predict", content, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "FastAPI AI service timed out at {BaseUrl}.", _httpClient.BaseAddress);
            throw new AiServiceException("AI service timed out. Please try again later.", HttpStatusCode.ServiceUnavailable, ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "FastAPI AI service request failed at {BaseUrl}.", _httpClient.BaseAddress);
            throw new AiServiceException("AI service is unavailable. Please try again later.", HttpStatusCode.ServiceUnavailable, ex);
        }

        using (response)
        {
            FastApiPredictionResponse? apiResult;
            try
            {
                apiResult = await response.Content.ReadFromJsonAsync<FastApiPredictionResponse>(cancellationToken: cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new AiServiceException("AI service returned an invalid response.", HttpStatusCode.BadGateway, ex);
            }
            catch (NotSupportedException ex)
            {
                throw new AiServiceException("AI service returned an invalid response.", HttpStatusCode.BadGateway, ex);
            }

            if (apiResult?.ClassIndex is not >= 0 || string.IsNullOrWhiteSpace(apiResult.ClassName)
                || apiResult.Confidence is not float confidence || !float.IsFinite(confidence)
                || confidence is < 0 or > 1 || apiResult.TopK is not { Count: > 0 }
                || apiResult.TopK.Any(item => item is null || item.ClassIndex is not >= 0
                    || string.IsNullOrWhiteSpace(item.ClassName)
                    || item.Confidence is not float score || !float.IsFinite(score)
                    || score is < 0 or > 1))
            {
                throw new AiServiceException("AI service returned an invalid response.", HttpStatusCode.BadGateway);
            }

            return new AiPredictionResult(
                apiResult.ClassIndex.Value,
                apiResult.ClassName,
                confidence,
                apiResult.TopK.Select(item => new AiPredictionTopKItem(item.ClassIndex!.Value, item.ClassName!, item.Confidence!.Value))
            );
        }
    }

    private class FastApiPredictionResponse
    {
        [JsonPropertyName("class_index")]
        public int? ClassIndex { get; set; }

        [JsonPropertyName("class_name")]
        public string? ClassName { get; set; }

        [JsonPropertyName("confidence")]
        public float? Confidence { get; set; }

        [JsonPropertyName("top_k")]
        public List<FastApiTopKResponse>? TopK { get; set; }
    }

    private class FastApiTopKResponse
    {
        [JsonPropertyName("class_index")]
        public int? ClassIndex { get; set; }

        [JsonPropertyName("class_name")]
        public string? ClassName { get; set; }

        [JsonPropertyName("confidence")]
        public float? Confidence { get; set; }
    }
}
