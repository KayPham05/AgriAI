using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PlantDiseaseConfiguration : IEntityTypeConfiguration<PlantDisease>
{
    public void Configure(EntityTypeBuilder<PlantDisease> builder)
    {
        builder.ToTable("plant_diseases", t =>
        {
            t.HasCheckConstraint("ck_plant_diseases_class_index", "class_index >= 0");
        });

        builder.HasKey(pd => pd.Id);
        builder.Property(pd => pd.Id).HasColumnName("id");

        builder.Property(pd => pd.PlantId)
            .HasColumnName("plant_id")
            .IsRequired();

        builder.Property(pd => pd.DiseaseId)
            .HasColumnName("disease_id")
            .IsRequired();

        builder.Property(pd => pd.ClassName)
            .HasColumnName("class_name")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(pd => pd.ClassIndex)
            .HasColumnName("class_index")
            .IsRequired();

        builder.Property(pd => pd.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.HasIndex(pd => pd.ClassIndex)
            .IsUnique()
            .HasDatabaseName("ix_plant_diseases_class_index");

        builder.HasIndex(pd => new { pd.PlantId, pd.DiseaseId })
            .IsUnique()
            .HasDatabaseName("ix_plant_diseases_plant_id_disease_id");

        builder.HasIndex(pd => pd.PlantId)
            .HasDatabaseName("ix_plant_diseases_plant_id");

        builder.HasIndex(pd => pd.DiseaseId)
            .HasDatabaseName("ix_plant_diseases_disease_id");

        builder.HasOne(pd => pd.Plant)
            .WithMany(p => p.PlantDiseases)
            .HasForeignKey(pd => pd.PlantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pd => pd.Disease)
            .WithMany(d => d.PlantDiseases)
            .HasForeignKey(pd => pd.DiseaseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
