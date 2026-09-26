using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Disease;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class DiseaseService : IDiseaseService
{
    private readonly IDiseaseRepository _diseaseRepository;

    public DiseaseService(IDiseaseRepository diseaseRepository)
    {
        _diseaseRepository = diseaseRepository;
    }

    public async Task<IEnumerable<DiseaseDto>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var diseases = await _diseaseRepository.GetAllAsync(includeInactive, cancellationToken);
        return diseases.Select(MapToDto);
    }

    public async Task<DiseaseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken);
        return disease != null ? MapToDto(disease) : null;
    }

    public async Task<DiseaseDto> CreateAsync(CreateDiseaseRequest request, CancellationToken cancellationToken = default)
    {
        var disease = new Disease
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            VietnameseName = request.VietnameseName,
            Description = request.Description,
            Symptoms = request.Symptoms,
            Treatment = request.Treatment,
            Prevention = request.Prevention,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _diseaseRepository.AddAsync(disease, cancellationToken);
        return MapToDto(disease);
    }

    public async Task<DiseaseDto> UpdateAsync(Guid id, UpdateDiseaseRequest request, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken);
        if (disease == null)
        {
            throw new KeyNotFoundException($"Disease with ID '{id}' not found.");
        }

        disease.Name = request.Name;
        disease.VietnameseName = request.VietnameseName;
        disease.Description = request.Description;
        disease.Symptoms = request.Symptoms;
        disease.Treatment = request.Treatment;
        disease.Prevention = request.Prevention;
        disease.IsActive = request.IsActive;
        disease.UpdatedAt = DateTime.UtcNow;

        await _diseaseRepository.UpdateAsync(disease, cancellationToken);
        return MapToDto(disease);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken);
        if (disease == null)
        {
            throw new KeyNotFoundException($"Disease with ID '{id}' not found.");
        }

        await _diseaseRepository.DeleteAsync(disease, cancellationToken);
    }

    private static DiseaseDto MapToDto(Disease disease)
    {
        return new DiseaseDto(
            disease.Id,
            disease.Name,
            disease.VietnameseName,
            disease.Description,
            disease.Symptoms,
            disease.Treatment,
            disease.Prevention,
            disease.IsActive,
            disease.CreatedAt
        );
    }
}
