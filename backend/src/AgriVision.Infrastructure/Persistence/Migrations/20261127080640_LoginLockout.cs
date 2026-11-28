using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class LoginLockout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "failed_login_attempts",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "login_locked_until",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "login_lockout_level",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "failed_login_attempts",
                table: "users");

            migrationBuilder.DropColumn(
                name: "login_locked_until",
                table: "users");

            migrationBuilder.DropColumn(
                name: "login_lockout_level",
                table: "users");
        }
    }
}
