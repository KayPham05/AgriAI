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

    public async Task<IEnumerable<DiseaseDto>> GetAllAsync(bool includeInactive = false, bool includeUnapproved = false, CancellationToken cancellationToken = default)
    {
        var diseases = await _diseaseRepository.GetAllAsync(includeInactive, cancellationToken);
        return diseases.Select(d => MapToDto(d, includeUnapproved));
    }

    public async Task<DiseaseDto?> GetByIdAsync(Guid id, bool includeUnapproved = false, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken);
        return disease != null ? MapToDto(disease, includeUnapproved) : null;
    }

    public async Task<DiseaseDto> CreateAsync(CreateDiseaseRequest request, CancellationToken cancellationToken = default)
    {
        var disease = new Disease
        {
            Id = Guid.NewGuid(),
            Name = CatalogValidation.Text(request.Name, "Name", 150),
            VietnameseName = request.VietnameseName,
            Description = request.Description,
            Symptoms = request.Symptoms,
            Treatment = request.Treatment,
            Prevention = request.Prevention,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _diseaseRepository.AddAsync(disease, cancellationToken);
        return MapToDto(disease, true);
    }

    public async Task<DiseaseDto> UpdateAsync(Guid id, UpdateDiseaseRequest request, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken);
        if (disease == null)
        {
            throw new KeyNotFoundException($"Disease with ID '{id}' not found.");
        }

        var name = CatalogValidation.Text(request.Name, "Name", 150);
        if (disease.Name != name || disease.VietnameseName != request.VietnameseName ||
            disease.Description != request.Description || disease.Symptoms != request.Symptoms ||
            disease.Treatment != request.Treatment || disease.Prevention != request.Prevention ||
            disease.IsActive != request.IsActive)
            disease.IsContentApproved = false;
        disease.Name = name;
        disease.VietnameseName = request.VietnameseName;
        disease.Description = request.Description;
        disease.Symptoms = request.Symptoms;
        disease.Treatment = request.Treatment;
        disease.Prevention = request.Prevention;
        disease.IsActive = request.IsActive;
        disease.UpdatedAt = DateTime.UtcNow;

        await _diseaseRepository.UpdateAsync(disease, cancellationToken);
        return MapToDto(disease, true);
    }

    public async Task<DiseaseDto> SetApprovalAsync(Guid id, bool approved, CancellationToken cancellationToken = default)
    {
        var disease = await _diseaseRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new KeyNotFoundException("Disease not found.");
        disease.IsContentApproved = approved;
        disease.UpdatedAt = DateTime.UtcNow;
        await _diseaseRepository.UpdateAsync(disease, cancellationToken);
        return MapToDto(disease, true);
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

    private static DiseaseDto MapToDto(Disease disease, bool includeUnapproved = false)
    {
        var visible = includeUnapproved || disease.IsContentApproved;
        const string pending = "Thông tin đang được cập nhật";
        return new DiseaseDto(
            disease.Id,
            disease.Name,
            disease.VietnameseName,
            visible ? disease.Description : pending,
            visible ? disease.Symptoms : pending,
            visible ? disease.Treatment : pending,
            visible ? disease.Prevention : pending,
            disease.IsActive,
            disease.CreatedAt
        ) { IsContentApproved = disease.IsContentApproved, ConditionType = disease.ConditionType };
    }
}
