namespace AgriVision.Domain.Entities;

public class KnowledgeDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public bool IsPublic { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<KnowledgeDocumentPlantDisease> PlantDiseases { get; set; } = new List<KnowledgeDocumentPlantDisease>();
}
