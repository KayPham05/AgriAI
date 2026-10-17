using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class KnowledgeDocumentPlantDiseaseConfiguration : IEntityTypeConfiguration<KnowledgeDocumentPlantDisease>
{
    public void Configure(EntityTypeBuilder<KnowledgeDocumentPlantDisease> builder)
    {
        builder.ToTable("knowledge_document_plant_diseases");
        builder.HasKey(link => new { link.KnowledgeDocumentId, link.PlantDiseaseId });
        builder.Property(link => link.KnowledgeDocumentId).HasColumnName("knowledge_document_id");
        builder.Property(link => link.PlantDiseaseId).HasColumnName("plant_disease_id");
        builder.HasOne(link => link.KnowledgeDocument).WithMany(document => document.PlantDiseases)
            .HasForeignKey(link => link.KnowledgeDocumentId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(link => link.PlantDisease).WithMany().HasForeignKey(link => link.PlantDiseaseId).OnDelete(DeleteBehavior.Restrict);
    }
}
