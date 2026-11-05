using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptionalMedicineTargetUse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_medicines_required",
                table: "medicines");

            migrationBuilder.AddCheckConstraint(
                name: "ck_medicines_required",
                table: "medicines",
                sql: "btrim(product_name) <> '' AND btrim(active_ingredient) <> '' AND btrim(source_url) <> '' AND btrim(safety_warning) <> '' AND btrim(label_reference) <> ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_medicines_required",
                table: "medicines");

            migrationBuilder.AddCheckConstraint(
                name: "ck_medicines_required",
                table: "medicines",
                sql: "btrim(product_name) <> '' AND btrim(active_ingredient) <> '' AND btrim(target_use) <> '' AND btrim(source_url) <> '' AND btrim(safety_warning) <> '' AND btrim(label_reference) <> ''");
        }
    }
}
