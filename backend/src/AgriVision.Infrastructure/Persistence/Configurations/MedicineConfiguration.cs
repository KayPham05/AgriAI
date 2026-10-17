using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class MedicineConfiguration : IEntityTypeConfiguration<Medicine>
{
    public void Configure(EntityTypeBuilder<Medicine> builder)
    {
        builder.ToTable("medicines", table =>
        {
            table.HasCheckConstraint("ck_medicines_required", "btrim(product_name) <> '' AND btrim(active_ingredient) <> '' AND btrim(target_use) <> '' AND btrim(source_url) <> '' AND btrim(safety_warning) <> '' AND btrim(label_reference) <> ''");
            table.HasCheckConstraint("ck_medicines_public", "NOT is_public OR (is_approved AND is_active)");
        });
        builder.HasKey(medicine => medicine.Id);
        builder.Property(medicine => medicine.Id).HasColumnName("id");
        builder.Property(medicine => medicine.ProductName).HasColumnName("product_name").HasMaxLength(200).IsRequired();
        builder.Property(medicine => medicine.ActiveIngredient).HasColumnName("active_ingredient").IsRequired();
        builder.Property(medicine => medicine.TargetUse).HasColumnName("target_use").IsRequired();
        builder.Property(medicine => medicine.SourceUrl).HasColumnName("source_url").IsRequired();
        builder.Property(medicine => medicine.SafetyWarning).HasColumnName("safety_warning").IsRequired();
        builder.Property(medicine => medicine.LabelReference).HasColumnName("label_reference").IsRequired();
        builder.Property(medicine => medicine.IsApproved).HasColumnName("is_approved").HasDefaultValue(false);
        builder.Property(medicine => medicine.IsPublic).HasColumnName("is_public").HasDefaultValue(false);
        builder.Property(medicine => medicine.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(medicine => medicine.CreatedAt).HasColumnName("created_at");
        builder.Property(medicine => medicine.UpdatedAt).HasColumnName("updated_at");
    }
}
