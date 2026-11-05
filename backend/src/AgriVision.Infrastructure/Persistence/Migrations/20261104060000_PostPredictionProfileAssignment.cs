using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AgriVision.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261104060000_PostPredictionProfileAssignment")]
public class PostPredictionProfileAssignment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE OR REPLACE FUNCTION agri127_guard_prediction_profile() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF TG_OP = 'UPDATE' AND NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
                    NEW.agricultural_profile_id := NULL;
                END IF;
                IF TG_OP = 'UPDATE' AND OLD.agricultural_profile_id IS NOT NULL
                    AND NEW.agricultural_profile_id IS NOT NULL
                    AND NEW.agricultural_profile_id IS DISTINCT FROM OLD.agricultural_profile_id THEN
                    RAISE EXCEPTION 'An existing profile link must be removed before selecting another profile'
                        USING ERRCODE = '23514';
                END IF;
                IF NEW.agricultural_profile_id IS NOT NULL THEN
                    PERFORM 1 FROM agricultural_profiles
                    WHERE id = NEW.agricultural_profile_id AND user_id = NEW.user_id FOR SHARE;
                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Diagnosis and profile must have the same owner' USING ERRCODE = '23514';
                    END IF;
                END IF;
                RETURN NEW;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("This migration is forward-only.");
}
