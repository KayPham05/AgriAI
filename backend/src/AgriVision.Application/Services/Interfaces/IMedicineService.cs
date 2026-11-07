using AgriVision.Application.DTOs.Common;
using AgriVision.Application.DTOs.Knowledge;
using AgriVision.Application.DTOs.Medicine;

namespace AgriVision.Application.Services.Interfaces;

public interface IMedicineService
{
    Task<PagedResult<MedicineDto>> ListAsync(CatalogFilterParams filter, bool publicOnly, CancellationToken cancellationToken = default);
    Task<MedicineDto> GetAsync(Guid id, bool publicOnly, CancellationToken cancellationToken = default);
    Task<MedicineDto> CreateAsync(CreateMedicineRequest request, CancellationToken cancellationToken = default);
    Task<MedicineDto> UpdateAsync(Guid id, UpdateMedicineRequest request, CancellationToken cancellationToken = default);
    Task<MedicineDto> PublishAsync(Guid id, CatalogPublicationRequest request, CancellationToken cancellationToken = default);
    Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<MedicineUseDto> AssignUseAsync(Guid id, Guid plantDiseaseId, AssignMedicineUseRequest request, CancellationToken cancellationToken = default);
    Task RemoveUseAsync(Guid id, Guid plantDiseaseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecommendedMedicineDto>> RecommendAsync(Guid plantDiseaseId, float confidence, CancellationToken cancellationToken = default);
}
