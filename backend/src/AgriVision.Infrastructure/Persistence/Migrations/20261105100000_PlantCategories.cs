using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations;

public partial class PlantCategories : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "category", table: "plants", type: "character varying(40)",
            maxLength: 40, nullable: false, defaultValue: "Khác");

        // Preserve the categories previously shown by the frontend for known catalog names.
        // Only this new column changes; AI labels, IDs and existing links are untouched.
        migrationBuilder.Sql("""
            UPDATE plants SET category = CASE
                WHEN lower(replace(name, '_', ' ')) IN ('ca phe', 'cà phê', 'coffee', 'che', 'chè', 'tea')
                    THEN 'Cây công nghiệp'
                WHEN lower(replace(name, '_', ' ')) IN ('ca chua', 'cà chua', 'tomato', 'lua', 'lúa', 'rice',
                    'ngo', 'ngô', 'corn', 'ot', 'ớt', 'pepper', 'chili', 'khoai tay', 'khoai tây', 'potato')
                    THEN 'Cây lương thực'
                WHEN lower(replace(name, '_', ' ')) IN ('cam', 'orange', 'xoai', 'xoài', 'mango',
                    'sau rieng', 'sầu riêng', 'durian', 'buoi', 'bưởi', 'pomelo', 'chuoi', 'chuối', 'banana',
                    'dua hau', 'dưa hấu', 'watermelon', 'nho', 'grape')
                    THEN 'Cây ăn trái'
                ELSE 'Khác'
            END;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropColumn(name: "category", table: "plants");
}
