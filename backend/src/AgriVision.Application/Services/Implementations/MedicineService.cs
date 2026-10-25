using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.Medicine;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;

namespace AgriVision.Application.Services.Implementations;

public class MedicineService(IMedicineRepository repository, IPlantDiseaseRepository pairs) : IMedicineService
{
    public async Task<PagedResult<MedicineDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default)
    {
        CatalogValidation.Filter(filter);
        var (items, total) = await repository.ListAsync(filter, publicOnly, cancellationToken);
        return new PagedResult<MedicineDto>(items.Select(m => Map(m, publicOnly)), filter.PageNumber, filter.PageSize, total);
    }

    public async Task<MedicineDto> GetAsync(Guid id, bool publicOnly, CancellationToken cancellationToken = default)
    {
        var medicine = await FindAsync(id, false, cancellationToken);
        if (publicOnly && !(medicine.IsActive && medicine.IsApproved && medicine.IsPublic))
            throw new KeyNotFoundException("Medicine not found.");
        return Map(medicine, publicOnly);
    }

    public async Task<MedicineDto> CreateAsync(CreateMedicineRequest request, CancellationToken cancellationToken = default)
    {
        var medicine = new Medicine();
        SetContent(medicine, request.ProductName, request.ActiveIngredient, request.TargetUse,
            request.SourceUrl, request.SafetyWarning, request.LabelReference);
        await repository.AddAsync(medicine, cancellationToken);
        return Map(await FindAsync(medicine.Id, false, cancellationToken));
    }

    public async Task<MedicineDto> UpdateAsync(Guid id, UpdateMedicineRequest request, CancellationToken cancellationToken = default)
    {
        var medicine = await FindAsync(id, true, cancellationToken);
        SetContent(medicine, request.ProductName, request.ActiveIngredient, request.TargetUse,
            request.SourceUrl, request.SafetyWarning, request.LabelReference);
        medicine.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
        // Database triggers revoke review flags; return persisted state, not stale tracked values.
        return Map(await FindAsync(id, false, cancellationToken));
    }

    public async Task<MedicineDto> PublishAsync(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken = default)
    {
        CatalogValidation.Publication(request);
        var medicine = await FindAsync(id, true, cancellationToken);
        medicine.IsApproved = request.IsApproved;
        medicine.IsPublic = request.IsPublic;
        medicine.IsActive = request.IsActive;
        medicine.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
        return Map(await FindAsync(id, false, cancellationToken));
    }

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var medicine = await FindAsync(id, true, cancellationToken);
        medicine.IsActive = false;
        medicine.IsPublic = false;
        medicine.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
    }

    public async Task<MedicineUseDto> AssignUseAsync(Guid id, Guid plantDiseaseId, AssignMedicineUseRequest request, CancellationToken cancellationToken = default)
    {
        var directions = CatalogValidation.Text(request.LabelDirections, "LabelDirections");
        var medicine = await FindAsync(id, true, cancellationToken);
        var pair = await pairs.GetByIdAsync(plantDiseaseId, cancellationToken);
        if (pair == null || !CatalogValidation.ActivePair(pair) || pair.Disease.ConditionType != "Disease")
            throw new ArgumentException("Medicine use requires an active plant/disease pair with condition Disease.");
        var use = medicine.Uses.SingleOrDefault(u => u.PlantDiseaseId == plantDiseaseId);
        var approved = request.IsApproved ?? use?.IsApproved ?? false;
        var verified = request.IsLabelVerified ?? use?.IsLabelVerified ?? false;
        if (approved && !verified)
            throw new ArgumentException("A medicine use must have a verified label before approval.");
        if (use == null)
        {
            use = new MedicineUse { MedicineId = id, PlantDiseaseId = plantDiseaseId, PlantDisease = pair };
            medicine.Uses.Add(use);
        }
        use.LabelDirections = directions;
        use.IsApproved = approved;
        use.IsLabelVerified = verified;
        medicine.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
        var saved = (await FindAsync(id, false, cancellationToken)).Uses.Single(u => u.PlantDiseaseId == plantDiseaseId);
        return new MedicineUseDto(plantDiseaseId, saved.LabelDirections, saved.IsLabelVerified, saved.IsApproved);
    }

    public async Task RemoveUseAsync(Guid id, Guid plantDiseaseId, CancellationToken cancellationToken = default)
    {
        var medicine = await FindAsync(id, true, cancellationToken);
        var use = medicine.Uses.SingleOrDefault(u => u.PlantDiseaseId == plantDiseaseId)
            ?? throw new KeyNotFoundException("Medicine use not found.");
        medicine.Uses.Remove(use);
        medicine.UpdatedAt = DateTime.UtcNow;
        await repository.SaveAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RecommendedMedicineDto>> RecommendAsync(Guid plantDiseaseId, float confidence, CancellationToken cancellationToken = default)
    {
        if (!float.IsFinite(confidence) || confidence <= 0.8f || confidence > 1) return [];
        var pair = await pairs.GetByIdAsync(plantDiseaseId, cancellationToken);
        if (pair == null || !CatalogValidation.ActivePair(pair) || !pair.Disease.IsContentApproved || pair.Disease.ConditionType != "Disease") return [];
        var uses = await repository.GetEligibleUsesAsync(plantDiseaseId, cancellationToken);
        return uses.Select(u => new RecommendedMedicineDto(u.MedicineId, u.PlantDiseaseId,
            u.Medicine.ProductName, u.Medicine.ActiveIngredient, u.Medicine.TargetUse,
            u.Medicine.SourceUrl, u.Medicine.SafetyWarning, u.Medicine.LabelReference,
            u.LabelDirections, u.Medicine.UpdatedAt)).ToList();
    }

    private async Task<Medicine> FindAsync(Guid id, bool tracking, CancellationToken cancellationToken) =>
        await repository.GetAsync(id, tracking, cancellationToken) ?? throw new KeyNotFoundException("Medicine not found.");

    private static void SetContent(Medicine medicine, string productName, string ingredient, string target,
        string source, string warning, string label)
    {
        // Validate all fields before mutating an entity tracked by a unit of work.
        var name = CatalogValidation.Text(productName, "ProductName", 200);
        var activeIngredient = CatalogValidation.Text(ingredient, "ActiveIngredient");
        var targetUse = CatalogValidation.Text(target, "TargetUse");
        var sourceUrl = CatalogValidation.Source(source);
        var safetyWarning = CatalogValidation.Text(warning, "SafetyWarning");
        var labelReference = CatalogValidation.Text(label, "LabelReference");
        medicine.ProductName = name;
        medicine.ActiveIngredient = activeIngredient;
        medicine.TargetUse = targetUse;
        medicine.SourceUrl = sourceUrl;
        medicine.SafetyWarning = safetyWarning;
        medicine.LabelReference = labelReference;
    }

    private static MedicineDto Map(Medicine medicine, bool publicOnly = false) => new(medicine.Id,
        medicine.ProductName, medicine.ActiveIngredient, medicine.TargetUse, medicine.SourceUrl,
        medicine.SafetyWarning, medicine.LabelReference, medicine.IsApproved, medicine.IsPublic,
        medicine.IsActive, medicine.CreatedAt, medicine.UpdatedAt,
        medicine.Uses.Where(u => !publicOnly || (u.IsApproved && u.IsLabelVerified && CatalogValidation.ActivePair(u.PlantDisease)))
            .OrderBy(u => u.PlantDiseaseId).Select(u => new MedicineUseDto(u.PlantDiseaseId, u.LabelDirections, u.IsLabelVerified, u.IsApproved)).ToList());
}
