using System;
using System.Collections.Generic;

namespace Backend.Models.Dtos
{
    public class MarketCommitteeDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int? DistrictId { get; set; }
        public int? RoleId { get; set; }
        public string? BranchCode { get; set; }
    }

    public class MandiDto
    {
        public int MandiId { get; set; }
        public int DistrictId { get; set; }
        public string MandiName { get; set; } = string.Empty;
        public string? MandiCode { get; set; }
    }

    public class PlotTypeDto
    {
        public int PlotTypeId { get; set; }
        public string? PlotType { get; set; }
        public int? PropertyTypeId { get; set; }
    }

    public class PlotSizeDto
    {
        public int PlotSizeId { get; set; }
        public string PlotSize { get; set; } = string.Empty;
    }

    public class PlanDto
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public DateTime PlanSanctionDate { get; set; }
    }

    public class PropertyTypeDto
    {
        public int PropertyTypeId { get; set; }
        public string? PropertyTypeName { get; set; }
    }

    public class BidderTypeDto
    {
        public int BidderTypeId { get; set; }
        public string BidderTypeName { get; set; } = string.Empty;
    }

    public class ApplicationStatusDto
    {
        public int ApplicationStatusId { get; set; }
        public string ApplicationStatusName { get; set; } = string.Empty;
    }
    public class PropertyBidderRegistration
    {
        public int PropertyId { get; set; }
        public string? AllotteeCode { get; set; }
        public string? AllotteeName { get; set; }
        public string? ApplicationStatusName { get; set; }
        public string? Remarks { get; set; }
    }
    public class PropertyBidderRegistrationDto
    {
        public int Id { get; set; }
        public string? PropertyCode { get; set; }
        public int MandiId { get; set; }
        public int BranchId { get; set; }
        public int DistrictId { get; set; }
        public int? PlotTypeId { get; set; }
        public int? PlanId { get; set; }
        public string? PlanName { get; set; }
        public string? PlotSize { get; set; }
        public int? PlotNo { get; set; }
        public int? ApplicantId { get; set; }

        // Compliance & Flags
        public bool? AssetResumed { get; set; }
        public bool? AssetSurrendered { get; set; }
        public bool? IsAssetLocked { get; set; }
        public bool? IsDefaulter { get; set; }
        public bool? AnyComplaint { get; set; }
        public bool? NdcGenerated { get; set; }
        public bool? NdcIssued { get; set; }
        public bool? AssetVerified { get; set; }
        public bool? IsCourtCase { get; set; }

        // Auction Info
        public bool? IsAuctioned { get; set; }
        public DateTime? AuctionDate { get; set; }
        public int? BidderTypeId { get; set; }
        public string? BidderName { get; set; }
        public string? Email { get; set; }
        public bool? IsTransferred { get; set; }

        // Personal Details
        public string? Relation { get; set; }
        public string? FatherOrHusbandName { get; set; }
        public string? PANNo { get; set; }
        public string? AadhaarNo { get; set; }
        public string? MobileNo { get; set; }
        public int? PropertyTypeId { get; set; }
        public string? Address { get; set; }

        // Financial Details
        public decimal? ReservePrice { get; set; }
        public decimal? FinalBidPrice { get; set; }
        public DateTime? AllotmentDate { get; set; }

        // Form Fee
        public string? FormTransactionId { get; set; }
        public DateTime? FormTxnDate { get; set; }
        public decimal? FormPaidAmount { get; set; }

        // EMD
        public string? EmdTxnId { get; set; }
        public DateTime? EmdDate { get; set; }
        public decimal? EmdAmount { get; set; }

        // 25% Allotment
        public string? AllotmentTxnId { get; set; }
        public DateTime? AllotmentTransactionDate { get; set; }
        public decimal? AllotmentAmount { get; set; }

        // Outstanding
        public decimal? DueAmount { get; set; }
        public decimal? TotalDueWithInterest { get; set; }

        public string? Remarks { get; set; }

        public int? ApplicationStatusId { get; set; }

        public List<InstallmentDetailsDto>? Installments { get; set; }
        public List<InstallmentScheduleDto>? InstallmentSchedules { get; set; }
        public List<InstallmentCalculationDto> InstallmentCalculations { get; set; }
        public string PlotStatus { get; set; } = string.Empty;
        public int? PropertyCategoryId { get; set; }
        public long? CreatedBy { get; set; }
        public long? ModifiedBy { get; set; }
        public string? Label { get; set; }
        public string? DistrictName { get; set; }
        public string? BranchName { get; set; }
        public string? MandiName { get; set; }
        public string? CategoryName { get; set; }
        public string? IdentityUserId { get; set; }
        public string? UserId { get; set; }
        public string? RoleName { get; set; }
        public string? FirstName { get; set; }

        public int? OwnerStateID { get; set; }
        public int? OwnerDistrtictID { get; set; }

        public int? OwnerCityID { get; set; }
        public string? ModifyByName { get; set; }

    }

    public class InstallmentScheduleDto
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string? PropertyCode { get; set; }
        public string? InstallmentNo { get; set; }
        public DateTime? CalculatedDueDate { get; set; }
        public decimal? BasePrincipal { get; set; }
        public decimal? Interest { get; set; }
        public decimal? TotalEstimatedAmount { get; set; }
        public bool? IsActive { get; set; }
    }

    public class PropertyCategoryDto
    {
        public int PropertyCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
    }

    public class InstallmentDetailsDto
    {
        public int Id { get; set; }
        public string? ReceiptNo { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public string? DraftNo { get; set; }
        public decimal? DraftAmount { get; set; }
        public DateTime? DraftDate { get; set; }
        public string? DraftBank { get; set; }
        public decimal? PrincipalAmount { get; set; }
        public decimal? InterestAmount { get; set; }
        public decimal? OtherAmount { get; set; }
        public decimal? PenaltyAmount { get; set; }
        public string? PenaltyType { get; set; }
        public int? AmountTypeId { get; set; }
        public string? Remarks { get; set; }
        public int? ApplicantId { get; set; }
        public int? PropertyId { get; set; }
        public bool? IsVerified { get; set; }
    }

    public class ClerkVerificationDto
    {
        public int Id { get; set; }
        public string Remarks { get; set; }
        public long? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public string? Decision { get; set; }
        public string? Role { get; set; }

    }


    public class BranchDto
    {
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
    }

    public class AuctionedPlotDto
    {
        public int? PlotNo { get; set; }
    }
    public class PropertyApprovalRequestDto
    {
        public int UserId { get; set; }
        public string? RoleId { get; set; }
        public int DistrictId { get; set; }
        public int BranchId { get; set; }
        public int MandiId { get; set; }
    }


    public class PlotNoDto
    {
        public int PlotTypeId { get; set; }
        public int? PlotNo { get; set; }
    }

    public class PropertyOwnerDetailsDto
    {
        public int Id { get; set; }
        public string? PropertyCode { get; set; }
        public int MandiId { get; set; }
        public int BranchId { get; set; }
        public int DistrictId { get; set; }
        public int? PlotTypeId { get; set; }
        public int? PlotNo { get; set; }
        public string? PlotSize { get; set; }
        public string? CurrentOwnerName { get; set; }
        public string? GuardianName { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public int? State { get; set; }
        public int? OwnerDistrict { get; set; }
        public int? City { get; set; }
        public string? Address { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? PanNo { get; set; }
        public string? AadhaarDocPath { get; set; }
        public string? PanDocPath { get; set; }
        public string? AddrDocPath { get; set; }
        public string? PhotoPath { get; set; }
    }

    public class InstallmentCalculationDto
    {
        public int InstallmentId { get; set; }
        public string? InstallmentNo { get; set; }

        public DateTime? DueDate { get; set; }
        public decimal InstallmentAmount { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public decimal ReceivedAmount { get; set; }

        public int DelayDays { get; set; }

        public decimal PenalInterest { get; set; }
        public decimal PenalityAmount { get; set; }
        public decimal TotalPenalityAmount { get; set; }

        public decimal ExtraAmount { get; set; }
    }
}
