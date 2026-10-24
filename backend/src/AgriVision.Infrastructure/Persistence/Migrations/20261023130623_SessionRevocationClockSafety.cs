using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AgriVision.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261023130623_SessionRevocationClockSafety")]
public sealed class SessionRevocationClockSafety : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Session timestamps may originate on a different application host.
        // Keep the revocation invariant even when its clock is ahead of PostgreSQL.
        migrationBuilder.Sql("""
            CREATE OR REPLACE FUNCTION agri127_revoke_user_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF OLD.role IS DISTINCT FROM NEW.role OR (OLD.is_active AND NOT NEW.is_active) THEN
                    UPDATE user_sessions SET revoked_at = GREATEST(clock_timestamp(), created_at)
                    WHERE user_id = NEW.id AND revoked_at IS NULL;
                END IF;
                RETURN NEW;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Session revocation clock safety is forward-only; restore from a verified backup for rollback.");
}
