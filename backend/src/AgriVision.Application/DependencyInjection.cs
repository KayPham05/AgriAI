using AgriVision.Application.Services.Implementations;
using AgriVision.Application.Services.Interfaces;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPlantService, PlantService>();
        services.AddScoped<IDiseaseService, DiseaseService>();
        services.AddScoped<IPredictionService, PredictionService>();

        // Register FluentValidation Validators
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        return services;
    }
}
