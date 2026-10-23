using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Infrastructure.Authentication;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Amazon.S3;
using Amazon.Runtime;

namespace AgriVision.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Register Authentication Services
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Register Repositories & Unit of Work
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IPlantRepository, PlantRepository>();
        services.AddScoped<IDiseaseRepository, DiseaseRepository>();
        services.AddScoped<IPlantDiseaseRepository, PlantDiseaseRepository>();
        services.AddScoped<IPredictionRepository, PredictionRepository>();
        services.AddScoped<IAdminAuditLogRepository, AdminAuditLogRepository>();
        services.AddScoped<IAgriculturalProfileRepository, AgriculturalProfileRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Register Image Storage Service
        services.AddSingleton<IAmazonS3>(_ =>
        {
            var endpoint = configuration["R2:ServiceUrl"];
            var accessKey = configuration["R2:AccessKeyId"];
            var secretKey = configuration["R2:SecretAccessKey"];
            if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "https" ||
                !uri.Host.EndsWith(".r2.cloudflarestorage.com", StringComparison.OrdinalIgnoreCase) ||
                uri.AbsolutePath != "/" || !uri.IsDefaultPort || !string.IsNullOrEmpty(uri.Fragment) ||
                !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.UserInfo) ||
                string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey) ||
                string.IsNullOrWhiteSpace(configuration["R2:BucketName"]))
                throw new ImageStorageException("Configure R2 ServiceUrl, BucketName, AccessKeyId and SecretAccessKey on the backend.");
            return new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), new AmazonS3Config
            {
                ServiceURL = endpoint, AuthenticationRegion = "auto", ForcePathStyle = true
            });
        });
        services.AddScoped<IImageStorage, R2ImageStorage>();
        services.AddScoped<IImageUploadJournal, ImageUploadJournal>();

        // Register AI Disease Predictor HTTP Client & Service
        services.AddHttpClient<IPlantDiseasePredictor, FastApiPlantDiseasePredictor>(client =>
            client.Timeout = TimeSpan.FromSeconds(configuration.GetValue("AiService:TimeoutSeconds", 15)));

        return services;
    }
}
