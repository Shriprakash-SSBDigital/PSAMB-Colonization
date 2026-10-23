using Backend.Models.DTOs;
using Backend.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Data;

public class ApplicationDbContext : IdentityDbContext<IdentityApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // ── IDENTITY & CUSTOM USER DBSETS ─────────────────────
    public DbSet<ApplicationUser> ApplicationUsers { get; set; }
    public DbSet<ApplicantAuth> ApplicantAuths => Set<ApplicantAuth>();
    public DbSet<MobileOTPs> MobileOTPs { get; set; }

    // ── MASTER TABLES ─────────────────────────────────────
    public DbSet<StateMaster> StateMasters { get; set; }
    public DbSet<DistrictMaster> DistrictMasters { get; set; }
    public DbSet<CityMaster> CityMasters { get; set; }
    public DbSet<EmailOtp> EmailOtps { get; set; }
    public DbSet<BranchMaster> BranchMaster { get; set; }
    public DbSet<MandiMaster> MandiMaster { get; set; }
    public DbSet<PlotSizeMaster> PlotSizeMaster { get; set; }
    public DbSet<PlotTypeMaster> PlotTypeMaster { get; set; }
    public DbSet<PlanMaster> PlanMaster { get; set; }
    public DbSet<PropertyType> PropertyType { get; set; }
    public DbSet<BidderTypeMaster> BidderTypeMaster { get; set; }
    public DbSet<ApplicationStatusMaster> ApplicationStatusMaster { get; set; }
    public DbSet<PropertyCategoryMaster> PropertyCategoryMaster { get; set; }

    // ── TRANSACTIONAL / FEATURE DBSETS ────────────────────
    public DbSet<PropertyBidderRegistration> PropertyBidderRegistration { get; set; }
    public DbSet<InstallmentDetails> InstallmentDetails { get; set; }
    public DbSet<BranchMandiAssociation>BranchMandiAssociation { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityUserRole<string>> UserRoles { get; set; }

    public DbSet<InstallmentSchedule> InstallmentSchedule { get; set; }
    public DbSet<UserPropertyRegistration> UserPropertyRegistration { get; set; }
    public DbSet<UserDocument> UserDocuments { get; set; }
    public DbSet<PropertyTimelineHistory> PropertyTimelineHistory { get; set; }


    public DbSet<HRMSData> HRMSDatas => Set<HRMSData>();
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // 1. GLOBAL DECIMAL PRECISION (Prevents EF Core decimal truncation warnings)
        foreach (var property in builder.Model.GetEntityTypes()
                    .SelectMany(t => t.GetProperties())
                    .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(2);
        }

        // 2. EXCLUDED EXISTING MASTERS
        builder.Entity<StateMaster>().ToTable("StateMaster", t => t.ExcludeFromMigrations()).HasKey(x => x.StateId);
        builder.Entity<DistrictMaster>().ToTable("DistrictMaster", t => t.ExcludeFromMigrations()).HasKey(x => x.DistrictId);
        builder.Entity<CityMaster>().ToTable("CityMaster", t => t.ExcludeFromMigrations()).HasKey(x => x.CityId);
        builder.Entity<EmailOtp>().ToTable("EmailOTP", t => t.ExcludeFromMigrations()).HasKey(x => x.OTPId);
        builder.Entity<IdentityApplicationUser>(b =>
        {
            b.Property(x => x.IsFirstLogin)
             .HasDefaultValue(true); 
        });
        // 3. ApplicationUser ENTITY CONFIGURATION
        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("ApplicationUser");
            b.HasKey(x => x.ApplicantId);
            b.Property(x => x.ApplicantId).UseIdentityColumn(100, 1);
            b.Property(x => x.IdentityUserId).HasMaxLength(450);
            b.HasIndex(x => x.IdentityUserId).IsUnique();
            b.Property(x => x.FirstName).HasMaxLength(200).IsRequired();
            b.Property(x => x.LastName).HasMaxLength(100);
            b.Property(x => x.Email).HasMaxLength(255).IsRequired();
            b.Property(x => x.MobileNo).HasMaxLength(15);
            b.Property(x => x.PANNumber).HasMaxLength(10);
            b.Property(x => x.GSTNumber).HasMaxLength(20);
            b.Property(x => x.IndividualPinCode).HasMaxLength(10);
            b.Property(x => x.BusinessPinCode).HasMaxLength(10);
            b.Property(x => x.FirmName).HasMaxLength(250);
            b.Property(x => x.MandiPropertyCode).HasMaxLength(100);
            b.Property(x => x.IdentDocNumber).HasMaxLength(100);
            b.Property(x => x.AddrDocNumber).HasMaxLength(100);
            b.Property(x => x.PhotoPath).HasMaxLength(500);
            b.Property(x => x.IdentDocPath).HasMaxLength(500);
            b.Property(x => x.PANDocPath).HasMaxLength(500);
            b.Property(x => x.AddrDocPath).HasMaxLength(500);
            b.Property(x => x.OfficePropertyPhotoPath).HasMaxLength(500);
            b.Property(x => x.IndividualPlotStreetLandmark).HasMaxLength(500);
            b.Property(x => x.BusinessPlotStreetLandmark).HasMaxLength(500);

            b.HasIndex(x => x.Email).IsUnique();
            b.HasIndex(x => x.MobileNo).IsUnique();
        });

        // 4. ApplicantAuth ENTITY CONFIGURATION
        builder.Entity<ApplicantAuth>(b =>
        {
            b.ToTable("ApplicantAuth");
            b.HasKey(x => x.AuthId);
            b.Property(x => x.AuthId).UseIdentityColumn(1, 1);
            b.Property(x => x.Username).HasMaxLength(255).IsRequired();
            b.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            b.Property(x => x.SaltKey).HasMaxLength(255).IsRequired();
            b.Property(x => x.LastLoginIP).HasMaxLength(50);
            b.HasIndex(x => x.Username).IsUnique();
            b.HasIndex(x => x.ApplicantId).IsUnique();
        });

        // 5. MobileOTPs ENTITY CONFIGURATION
        builder.Entity<MobileOTPs>(b =>
        {
            b.ToTable("MobileOTP");
            b.HasKey(x => x.OTPId);
            b.Property(x => x.OTPId).UseIdentityColumn(1, 1);
            b.Property(x => x.MobileNumber).HasMaxLength(15).IsRequired();
            b.Property(x => x.OTP).HasMaxLength(10).IsRequired();
        });
        builder.Entity<HRMSData>(b =>
        {
            b.ToTable("HRMSData", t => t.ExcludeFromMigrations());

            b.HasKey(x => x.HRMSCODE);

            b.Property(x => x.HRMSCODE)
                .HasMaxLength(50)
                .IsRequired();

            b.Property(x => x.EmployeeName)
                .HasMaxLength(200);

            b.Property(x => x.MobileNo)
                .HasMaxLength(15);

            b.Property(x => x.Email)
                .HasMaxLength(255);
        });
    }

    // ── SAFE TDE CHECK ───────────────────────────────────
    public async Task<bool> VerifyTdeAsync(bool throwOnFailure = false)
    {
        try
        {
            var isEncrypted = false;
            var connection = Database.GetDbConnection();
            var wasOpen = connection.State == System.Data.ConnectionState.Open;

            if (!wasOpen)
                await Database.OpenConnectionAsync();

            using (var command = connection.CreateCommand())
            {
                command.CommandText = "SELECT is_encrypted FROM sys.databases WHERE name = DB_NAME()";
                var result = await command.ExecuteScalarAsync();
                if (result != null && result != DBNull.Value)
                    isEncrypted = Convert.ToInt32(result) == 1;
            }

            if (!wasOpen)
                await Database.CloseConnectionAsync();

            if (!isEncrypted && throwOnFailure)
                throw new InvalidOperationException("CRITICAL: TDE is NOT enabled on the target database.");

            return isEncrypted;
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            if (throwOnFailure)
                throw new InvalidOperationException("TDE verification failed.", ex);

            return false;
        }
    }
}