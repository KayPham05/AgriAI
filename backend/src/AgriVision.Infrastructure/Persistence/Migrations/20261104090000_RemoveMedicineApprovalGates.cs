using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AgriVision.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261104090000_RemoveMedicineApprovalGates")]
public sealed class RemoveMedicineApprovalGates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(name: "ck_medicines_public", table: "medicines");
        migrationBuilder.AddCheckConstraint(
            name: "ck_medicines_public",
            table: "medicines",
            sql: "NOT is_public OR is_active");
        migrationBuilder.DropCheckConstraint(name: "ck_medicine_uses_approval", table: "medicine_uses");

        migrationBuilder.Sql("""
            CREATE OR REPLACE FUNCTION agri127_review_medicine() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF ROW(NEW.product_name, NEW.active_ingredient, NEW.target_use, NEW.source_url, NEW.safety_warning, NEW.label_reference, NEW.is_active)
                    IS DISTINCT FROM ROW(OLD.product_name, OLD.active_ingredient, OLD.target_use, OLD.source_url, OLD.safety_warning, OLD.label_reference, OLD.is_active) THEN
                    NEW.is_approved := false;
                    NEW.updated_at := clock_timestamp();
                    UPDATE medicine_uses SET is_approved = false, is_label_verified = false WHERE medicine_id = OLD.id;
                END IF;
                RETURN NEW;
            END $$;

            CREATE OR REPLACE FUNCTION agri127_review_medicine_use() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF ROW(NEW.medicine_id, NEW.plant_disease_id, NEW.label_directions)
                    IS DISTINCT FROM ROW(OLD.medicine_id, OLD.plant_disease_id, OLD.label_directions) THEN
                    NEW.is_approved := false;
                    NEW.is_label_verified := false;
                    UPDATE medicines SET is_approved = false, updated_at = clock_timestamp()
                    WHERE id IN (OLD.medicine_id, NEW.medicine_id);
                END IF;
                RETURN NEW;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE medicines SET is_public = false WHERE is_public AND NOT (is_approved AND is_active);
            UPDATE medicine_uses SET is_approved = false WHERE is_approved AND NOT is_label_verified;
            """);

        migrationBuilder.DropCheckConstraint(name: "ck_medicines_public", table: "medicines");
        migrationBuilder.AddCheckConstraint(
            name: "ck_medicines_public",
            table: "medicines",
            sql: "NOT is_public OR (is_approved AND is_active)");
        migrationBuilder.AddCheckConstraint(
            name: "ck_medicine_uses_approval",
            table: "medicine_uses",
            sql: "NOT is_approved OR is_label_verified");

        migrationBuilder.Sql("""
            CREATE OR REPLACE FUNCTION agri127_review_medicine() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF ROW(NEW.product_name, NEW.active_ingredient, NEW.target_use, NEW.source_url, NEW.safety_warning, NEW.label_reference, NEW.is_active)
                    IS DISTINCT FROM ROW(OLD.product_name, OLD.active_ingredient, OLD.target_use, OLD.source_url, OLD.safety_warning, OLD.label_reference, OLD.is_active) THEN
                    NEW.is_approved := false;
                    NEW.is_public := false;
                    NEW.updated_at := clock_timestamp();
                    UPDATE medicine_uses SET is_approved = false, is_label_verified = false WHERE medicine_id = OLD.id;
                END IF;
                RETURN NEW;
            END $$;

            CREATE OR REPLACE FUNCTION agri127_review_medicine_use() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF ROW(NEW.medicine_id, NEW.plant_disease_id, NEW.label_directions)
                    IS DISTINCT FROM ROW(OLD.medicine_id, OLD.plant_disease_id, OLD.label_directions) THEN
                    NEW.is_approved := false;
                    NEW.is_label_verified := false;
                    UPDATE medicines SET is_approved = false, is_public = false, updated_at = clock_timestamp()
                    WHERE id IN (OLD.medicine_id, NEW.medicine_id);
                END IF;
                RETURN NEW;
            END $$;
            """);
    }
}
