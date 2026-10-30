using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class addnewcolumnpenaltyorder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PenaltyOrderDate",
                table: "PropertyBidderRegistration",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PenaltyRateInorder",
                table: "PropertyBidderRegistration",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PenaltyOrderDate",
                table: "PropertyBidderRegistration");

            migrationBuilder.DropColumn(
                name: "PenaltyRateInorder",
                table: "PropertyBidderRegistration");
        }
    }
}
