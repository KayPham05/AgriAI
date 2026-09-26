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

namespace AgriVision.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=agrivision_db;Username=agrivision_user;Password=agrivision_pass";

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Register Authentication Services
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Register Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPlantRepository, PlantRepository>();
        services.AddScoped<IDiseaseRepository, DiseaseRepository>();
        services.AddScoped<IPlantDiseaseRepository, PlantDiseaseRepository>();
        services.AddScoped<IPredictionRepository, PredictionRepository>();

        // Register Image Storage Service
        services.AddScoped<IImageStorage, CloudinaryImageStorage>();

        // Register AI Disease Predictor HTTP Client & Service
        services.AddHttpClient<IPlantDiseasePredictor, FastApiPlantDiseasePredictor>();

        return services;
    }
}
