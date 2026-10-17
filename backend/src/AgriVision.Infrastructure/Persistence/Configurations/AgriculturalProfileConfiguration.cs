using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class AgriculturalProfileConfiguration : IEntityTypeConfiguration<AgriculturalProfile>
{
    public void Configure(EntityTypeBuilder<AgriculturalProfile> builder)
    {
        builder.ToTable("agricultural_profiles", table => table.HasCheckConstraint("ck_agricultural_profiles_name", "btrim(name) <> ''"));
        builder.HasKey(profile => profile.Id);
        builder.Property(profile => profile.Id).HasColumnName("id");
        builder.Property(profile => profile.UserId).HasColumnName("user_id");
        builder.Property(profile => profile.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(profile => profile.Description).HasColumnName("description");
        builder.Property(profile => profile.CreatedAt).HasColumnName("created_at");
        builder.Property(profile => profile.UpdatedAt).HasColumnName("updated_at");
        builder.HasOne(profile => profile.User).WithMany().HasForeignKey(profile => profile.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(profile => new { profile.UserId, profile.CreatedAt });
    }
}
