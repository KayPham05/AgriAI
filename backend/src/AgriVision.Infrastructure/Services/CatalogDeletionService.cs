using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.Services.Implementations;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Services;

public sealed class CatalogDeletionService(AppDbContext db, IImageUploadJournal journal,
    IServiceProvider services, ILogger<CatalogDeletionService> logger) : ICatalogDeletionService
{
    public async Task DeleteAsync(string kind, Guid id, Guid actorId, CancellationToken ct = default)
    {
        if (kind is not ("plants" or "diseases" or "medicines"))
            throw new ArgumentException("Loại danh mục không hợp lệ.");
        string? imageKey = null;
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            if (kind == "medicines")
            {
                var medicine = await db.Medicines.FromSqlInterpolated($"SELECT * FROM medicines WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
                    ?? throw new KeyNotFoundException("Không tìm thấy thuốc.");
                db.Medicines.Remove(medicine);
            }
            else
            {
                if (kind == "plants")
                {
                    var plant = await db.Plants.FromSqlInterpolated($"SELECT * FROM plants WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
                        ?? throw new KeyNotFoundException("Không tìm thấy cây trồng.");
                    imageKey = plant.ImageKey;
                }
                else
                {
                    var disease = await db.Diseases.FromSqlInterpolated($"SELECT * FROM diseases WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
                        ?? throw new KeyNotFoundException("Không tìm thấy bệnh.");
                    imageKey = disease.ImageKey;
                }
                // Block new dependent rows while snapshots and links are detached.
                var pairs = kind == "plants"
                    ? await db.PlantDiseases.FromSqlInterpolated($"SELECT * FROM plant_diseases WHERE plant_id = {id} FOR UPDATE").ToListAsync(ct)
                    : await db.PlantDiseases.FromSqlInterpolated($"SELECT * FROM plant_diseases WHERE disease_id = {id} FOR UPDATE").ToListAsync(ct);
                var pairIds = pairs.Select(p => p.Id).ToArray();
                var histories = await db.Predictions
                    .Where(p => (p.PredictedPlantDiseaseId.HasValue && pairIds.Contains(p.PredictedPlantDiseaseId.Value)) ||
                        p.PredictionDetails.Any(d => d.PlantDiseaseId.HasValue && pairIds.Contains(d.PlantDiseaseId.Value)))
                    .Include(p => p.PredictedPlantDisease).ThenInclude(p => p.Plant)
                    .Include(p => p.PredictedPlantDisease).ThenInclude(p => p.Disease)
                    .Include(p => p.PredictionDetails).ThenInclude(d => d.PlantDisease).ThenInclude(p => p.Plant)
                    .Include(p => p.PredictionDetails).ThenInclude(d => d.PlantDisease).ThenInclude(p => p.Disease)
                    .Include(p => p.Images).ToListAsync(ct);
                foreach (var history in histories) PredictionService.PreserveBeforeCatalogDeletion(history);
                await db.SaveChangesAsync(ct);
                if (imageKey != null) await journal.RetireCatalogAsync(actorId, kind, id, imageKey, ct);
                await db.MedicineUses.Where(u => pairIds.Contains(u.PlantDiseaseId)).ExecuteDeleteAsync(ct);
                await db.KnowledgeDocumentPlantDiseases.Where(l => pairIds.Contains(l.PlantDiseaseId)).ExecuteDeleteAsync(ct);
                await db.PlantDiseases.Where(p => pairIds.Contains(p.Id)).ExecuteDeleteAsync(ct);
                if (kind == "plants") await db.Plants.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
                else await db.Diseases.Where(d => d.Id == id).ExecuteDeleteAsync(ct);
            }
            db.AdminAuditLogs.Add(new AdminAuditLog { ActorUserId = actorId, Action = $"DeleteCatalog_{kind}_{id:D}" });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        if (imageKey == null) return;
        // Resolve storage only for records with photos; text deletion needs no R2 configuration.
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            if (await services.GetRequiredService<IImageStorage>().DeleteImageAsync(imageKey, timeout.Token))
                await journal.CompleteAsync(imageKey, timeout.Token);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Deleted catalog image remains queued for explicit cleanup.");
        }
    }
}
