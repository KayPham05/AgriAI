using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class MedicineUseConfiguration : IEntityTypeConfiguration<MedicineUse>
{
    public void Configure(EntityTypeBuilder<MedicineUse> builder)
    {
        builder.ToTable("medicine_uses", table =>
        {
            table.HasCheckConstraint("ck_medicine_uses_directions", "btrim(label_directions) <> ''");
            table.HasCheckConstraint("ck_medicine_uses_approval", "NOT is_approved OR is_label_verified");
        });
        builder.HasKey(use => new { use.MedicineId, use.PlantDiseaseId });
        builder.Property(use => use.MedicineId).HasColumnName("medicine_id");
        builder.Property(use => use.PlantDiseaseId).HasColumnName("plant_disease_id");
        builder.Property(use => use.LabelDirections).HasColumnName("label_directions").IsRequired();
        builder.Property(use => use.IsLabelVerified).HasColumnName("is_label_verified").HasDefaultValue(false);
        builder.Property(use => use.IsApproved).HasColumnName("is_approved").HasDefaultValue(false);
        builder.HasOne(use => use.Medicine).WithMany(medicine => medicine.Uses)
            .HasForeignKey(use => use.MedicineId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(use => use.PlantDisease).WithMany().HasForeignKey(use => use.PlantDiseaseId).OnDelete(DeleteBehavior.Restrict);
    }
}
