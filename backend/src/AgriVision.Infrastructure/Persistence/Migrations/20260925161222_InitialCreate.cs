using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "diseases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    vietnamese_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    symptoms = table.Column<string>(type: "text", nullable: true),
                    treatment = table.Column<string>(type: "text", nullable: true),
                    prevention = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_diseases", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "plants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    vietnamese_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    scientific_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plants", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "User"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "plant_diseases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    plant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    disease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    class_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    class_index = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plant_diseases", x => x.id);
                    table.CheckConstraint("ck_plant_diseases_class_index", "class_index >= 0");
                    table.ForeignKey(
                        name: "FK_plant_diseases_diseases_disease_id",
                        column: x => x.disease_id,
                        principalTable: "diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_plant_diseases_plants_plant_id",
                        column: x => x.plant_id,
                        principalTable: "plants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "predictions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    image_path = table.Column<string>(type: "text", nullable: false),
                    image_public_id = table.Column<string>(type: "text", nullable: true),
                    predicted_plant_disease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_predictions_plant_diseases_predicted_plant_disease_id",
                        column: x => x.predicted_plant_disease_id,
                        principalTable: "plant_diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_predictions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "prediction_details",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plant_disease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    probability = table.Column<double>(type: "double precision", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prediction_details", x => x.id);
                    table.CheckConstraint("ck_prediction_details_rank", "rank > 0");
                    table.ForeignKey(
                        name: "FK_prediction_details_plant_diseases_plant_disease_id",
                        column: x => x.plant_disease_id,
                        principalTable: "plant_diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prediction_details_predictions_prediction_id",
                        column: x => x.prediction_id,
                        principalTable: "predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_diseases_name",
                table: "diseases",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plant_diseases_class_index",
                table: "plant_diseases",
                column: "class_index",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plant_diseases_disease_id",
                table: "plant_diseases",
                column: "disease_id");

            migrationBuilder.CreateIndex(
                name: "ix_plant_diseases_plant_id",
                table: "plant_diseases",
                column: "plant_id");

            migrationBuilder.CreateIndex(
                name: "ix_plant_diseases_plant_id_disease_id",
                table: "plant_diseases",
                columns: new[] { "plant_id", "disease_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plants_name",
                table: "plants",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_prediction_details_plant_disease_id",
                table: "prediction_details",
                column: "plant_disease_id");

            migrationBuilder.CreateIndex(
                name: "ix_prediction_details_prediction_id",
                table: "prediction_details",
                column: "prediction_id");

            migrationBuilder.CreateIndex(
                name: "ix_prediction_details_prediction_id_rank",
                table: "prediction_details",
                columns: new[] { "prediction_id", "rank" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_predictions_created_at",
                table: "predictions",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_predictions_predicted_plant_disease_id",
                table: "predictions",
                column: "predicted_plant_disease_id");

            migrationBuilder.CreateIndex(
                name: "ix_predictions_user_id",
                table: "predictions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prediction_details");

            migrationBuilder.DropTable(
                name: "predictions");

            migrationBuilder.DropTable(
                name: "plant_diseases");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "diseases");

            migrationBuilder.DropTable(
                name: "plants");
        }
    }
}
