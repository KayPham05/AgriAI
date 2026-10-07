using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class UserIdentityConfiguration : IEntityTypeConfiguration<UserIdentity>
{
    public void Configure(EntityTypeBuilder<UserIdentity> builder)
    {
        builder.ToTable("user_identities");
        builder.HasKey(identity => identity.Id);
        builder.Property(identity => identity.Id).HasColumnName("id");
        builder.Property(identity => identity.UserId).HasColumnName("user_id");
        builder.Property(identity => identity.Provider).HasColumnName("provider").HasMaxLength(30).IsRequired();
        builder.Property(identity => identity.ProviderSubject).HasColumnName("provider_subject").HasMaxLength(255).IsRequired();
        builder.Property(identity => identity.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(identity => new { identity.Provider, identity.ProviderSubject }).IsUnique();
        builder.HasOne(identity => identity.User).WithMany().HasForeignKey(identity => identity.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
