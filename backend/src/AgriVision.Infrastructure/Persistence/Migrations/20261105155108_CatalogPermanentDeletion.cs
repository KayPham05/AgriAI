using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CatalogPermanentDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_prediction_details_plant_diseases_plant_disease_id",
                table: "prediction_details");

            migrationBuilder.DropForeignKey(
                name: "FK_predictions_plant_diseases_predicted_plant_disease_id",
                table: "predictions");

            migrationBuilder.AlterColumn<Guid>(
                name: "predicted_plant_disease_id",
                table: "predictions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "plant_disease_id",
                table: "prediction_details",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_prediction_details_plant_diseases_plant_disease_id",
                table: "prediction_details",
                column: "plant_disease_id",
                principalTable: "plant_diseases",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_predictions_plant_diseases_predicted_plant_disease_id",
                table: "predictions",
                column: "predicted_plant_disease_id",
                principalTable: "plant_diseases",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Deleted catalog identifiers cannot be reconstructed without losing history.
            throw new NotSupportedException("CatalogPermanentDeletion is forward-only. Restore a backup to downgrade.");
        }
    }
}
