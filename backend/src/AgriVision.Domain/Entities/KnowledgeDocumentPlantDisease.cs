namespace AgriVision.Domain.Entities;

public class KnowledgeDocumentPlantDisease
{
    public Guid KnowledgeDocumentId { get; set; }
    public Guid PlantDiseaseId { get; set; }
    public KnowledgeDocument KnowledgeDocument { get; set; } = null!;
    public PlantDisease PlantDisease { get; set; } = null!;
}
