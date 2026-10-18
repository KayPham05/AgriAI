using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class KnowledgeDocumentConfiguration : IEntityTypeConfiguration<KnowledgeDocument>
{
    public void Configure(EntityTypeBuilder<KnowledgeDocument> builder)
    {
        builder.ToTable("knowledge_documents", table =>
        {
            table.HasCheckConstraint("ck_knowledge_documents_required", "btrim(title) <> '' AND btrim(content) <> '' AND btrim(source_url) <> ''");
            table.HasCheckConstraint("ck_knowledge_documents_public", "NOT is_public OR (is_approved AND is_active)");
        });
        builder.HasKey(document => document.Id);
        builder.Property(document => document.Id).HasColumnName("id");
        builder.Property(document => document.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(document => document.Content).HasColumnName("content").IsRequired();
        builder.Property(document => document.SourceUrl).HasColumnName("source_url").IsRequired();
        builder.Property(document => document.IsApproved).HasColumnName("is_approved").HasDefaultValue(false);
        builder.Property(document => document.IsPublic).HasColumnName("is_public").HasDefaultValue(false);
        builder.Property(document => document.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(document => document.CreatedAt).HasColumnName("created_at");
        builder.Property(document => document.UpdatedAt).HasColumnName("updated_at");
    }
}
