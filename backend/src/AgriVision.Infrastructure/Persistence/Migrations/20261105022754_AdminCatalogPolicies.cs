using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AdminCatalogPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_plant_diseases_class_index",
                table: "plant_diseases");

            migrationBuilder.AddColumn<string>(
                name: "revocation_reason",
                table: "user_sessions",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "kind",
                table: "user_notifications",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Warning");

            migrationBuilder.AlterColumn<string>(
                name: "class_name",
                table: "plant_diseases",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<int>(
                name: "class_index",
                table: "plant_diseases",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddCheckConstraint(
                name: "ck_plant_diseases_class_index",
                table: "plant_diseases",
                sql: "(class_index IS NULL AND class_name IS NULL) OR (class_index IS NOT NULL AND class_index >= 0 AND class_name IS NOT NULL AND length(trim(class_name)) > 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Never invent an AI class or delete catalog-only pairs during rollback.
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM plant_diseases WHERE class_index IS NULL OR class_name IS NULL) THEN
                        RAISE EXCEPTION 'Cannot downgrade while catalog-only plant/disease links exist. Preserve their history and use a forward migration.';
                    END IF;
                END $$;
                """);
            migrationBuilder.DropCheckConstraint(
                name: "ck_plant_diseases_class_index",
                table: "plant_diseases");

            migrationBuilder.DropColumn(
                name: "revocation_reason",
                table: "user_sessions");

            migrationBuilder.DropColumn(
                name: "kind",
                table: "user_notifications");

            migrationBuilder.AlterColumn<string>(
                name: "class_name",
                table: "plant_diseases",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "class_index",
                table: "plant_diseases",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_plant_diseases_class_index",
                table: "plant_diseases",
                sql: "class_index >= 0");
        }
    }
}
