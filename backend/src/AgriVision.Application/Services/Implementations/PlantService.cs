using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Plant;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class PlantService : IPlantService
{
    private readonly IPlantRepository _plantRepository;

    public PlantService(IPlantRepository plantRepository)
    {
        _plantRepository = plantRepository;
    }

    public async Task<IEnumerable<PlantDto>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var plants = await _plantRepository.GetAllAsync(includeInactive, cancellationToken);
        return plants.Select(MapToDto);
    }

    public async Task<PlantDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var plant = await _plantRepository.GetByIdAsync(id, cancellationToken);
        return plant != null ? MapToDto(plant) : null;
    }

    public async Task<PlantDto> CreateAsync(CreatePlantRequest request, CancellationToken cancellationToken = default)
    {
        var plant = new Plant
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            VietnameseName = request.VietnameseName,
            ScientificName = request.ScientificName,
            Description = request.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _plantRepository.AddAsync(plant, cancellationToken);
        return MapToDto(plant);
    }

    public async Task<PlantDto> UpdateAsync(Guid id, UpdatePlantRequest request, CancellationToken cancellationToken = default)
    {
        var plant = await _plantRepository.GetByIdAsync(id, cancellationToken);
        if (plant == null)
        {
            throw new KeyNotFoundException($"Plant with ID '{id}' not found.");
        }

        plant.Name = request.Name;
        plant.VietnameseName = request.VietnameseName;
        plant.ScientificName = request.ScientificName;
        plant.Description = request.Description;
        plant.IsActive = request.IsActive;
        plant.UpdatedAt = DateTime.UtcNow;

        await _plantRepository.UpdateAsync(plant, cancellationToken);
        return MapToDto(plant);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var plant = await _plantRepository.GetByIdAsync(id, cancellationToken);
        if (plant == null)
        {
            throw new KeyNotFoundException($"Plant with ID '{id}' not found.");
        }

        await _plantRepository.DeleteAsync(plant, cancellationToken);
    }

    private static PlantDto MapToDto(Plant plant)
    {
        return new PlantDto(
            plant.Id,
            plant.Name,
            plant.VietnameseName,
            plant.ScientificName,
            plant.Description,
            plant.IsActive,
            plant.CreatedAt
        );
    }
}
