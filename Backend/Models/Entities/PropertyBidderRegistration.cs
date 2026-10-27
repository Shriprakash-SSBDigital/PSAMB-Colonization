using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities
{
    public class PropertyBidderRegistration
    {
        [Key]
        public int Id { get; set; }

        // Property Information

        public int MandiId { get; set; }
        [ForeignKey("MandiId")]
        public virtual MandiMaster? Mandi { get; set; }

        public int BranchId { get; set; }
        [ForeignKey("BranchId")]
        public virtual BranchMaster? Branch { get; set; }

        public int DistrictId { get; set; }
        [ForeignKey("DistrictId")]
        public virtual DistrictMaster? District { get; set; }

        public int? PlotTypeId { get; set; }
        [ForeignKey("PlotTypeId")]
        public virtual PlotTypeMaster? PlotType { get; set; }

        public int? PlanId { get; set; }
        [ForeignKey("PlanId")]
        public virtual PlanMaster? Plan { get; set; }
        public int ApplicantId { get; set; }
        public string? PlotSize { get; set; }
        public int? PlotNo { get; set; }

        // Compliance & Flags
        public bool AssetResumed { get; set; }
        public bool AssetSurrendered { get; set; }
        public bool IsAssetLocked { get; set; }
        public bool IsDefaulter { get; set; }
        public bool AnyComplaint { get; set; }
        public bool NdcGenerated { get; set; }
        public bool NdcIssued { get; set; }
        public bool AssetVerified { get; set; }
        public bool IsCourtCase { get; set; }

        // Auction Info
        public bool IsAuctioned { get; set; }
        public DateTime? AuctionDate { get; set; }

        public int? BidderTypeId { get; set; }
        [ForeignKey("BidderTypeId")]
        public virtual BidderTypeMaster? BidderType { get; set; }

        public string? BidderName { get; set; }
        public string? Email { get; set; }
        public bool IsTransferred { get; set; }

        // Personal Details
        public string? Relation { get; set; }
        public string? FatherOrHusbandName { get; set; }
        public string? PANNo { get; set; }
        public string? AadhaarNo { get; set; }
        public string? MobileNo { get; set; }

        public int? PropertyTypeId { get; set; }
        [ForeignKey("PropertyTypeId")]
        public virtual PropertyType? PropertyType { get; set; }

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

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public long? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public long? ModifiedBy { get; set; }

        public int? ApplicationStatusId { get; set; }
        public string? PlotStatus{ get; set; }
        public int PropertyCategoryId { get; set; }
        public string? PropertyCode { get; set; }
        public int? OwnerStateID { get; set; }
        public int? OwnerDistrtictID { get; set; }

        public int? OwnerCityID { get; set; }
        public bool IsUser { get; set; } = false;
        public int? VerificationUserEndStatusId { get; set; }

    }
    public class PlotSizeMaster
    {
        [Key]
        public int PlotSizeId { get; set; }

        public string PlotSize { get; set; } = string.Empty;

        public bool? IsActive { get; set; }

        public bool? IsDeleted { get; set; }

        public DateTime? CreatedDate { get; set; }

        public long? CreatedBy { get; set; }

        public long? ModifiedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public bool? IsColonized { get; set; }

        public double? CoveredArea { get; set; }

        public double? Basement { get; set; }

        public double? FirstFloor { get; set; }
    }

    public class PlotTypeMaster
    {
        [Key]
        public int PlotTypeId { get; set; }

        public string? PlotType { get; set; }

        public int? PropertyTypeId { get; set; }

        public bool? IsActive { get; set; }

        public bool? IsDeleted { get; set; }

        public long? CreatedBy { get; set; }

        public long? ModifiedBy { get; set; }

        public DateTime? CreatedDate { get; set; }

        public DateTime? ModifiedDate { get; set; }
    }

    public class PlanMaster
    {
        [Key]
        public int PlanId { get; set; }

        public string PlanName { get; set; } = string.Empty;

        public DateTime PlanSanctionDate { get; set; }

        public byte[]? PlanMap { get; set; }

        public string? Remarks { get; set; }

        public bool? IsActive { get; set; }

        public bool? IsDeleted { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? CreatedDate { get; set; }

        public long? ModifiedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public bool? IsColonized { get; set; }
    }
    public class PropertyType
    {
        [Key]
        public int PropertyTypeId { get; set; }

        public string? PropertyTypeName { get; set; }

        public DateTime CreatedDate { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public long? ModifiedBy { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }
    }
    public class BidderTypeMaster
    {
        [Key]
        public int BidderTypeId { get; set; }

        public string BidderTypeName { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public long? ModifiedBy { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }
    }
    public class ApplicationStatusMaster
    {
        [Key]
        public int ApplicationStatusId { get; set; }

        public string ApplicationStatusName { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public long? ModifiedBy { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }
    }

    public class PropertyCategoryMaster
    {
        [Key]
        public int PropertyCategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public long? ModifiedBy { get; set; }

        public bool IsDeleted { get; set; }

        public bool IsActive { get; set; }
    }

    public class InstallmentSchedule
    {
        [Key]
        public int Id { get; set; }

        public int PropertyId { get; set; }

        public string? PropertyCode { get; set; }

        public string? InstallmentNo { get; set; }

        public DateTime? CalculatedDueDate { get; set; }

        public decimal BasePrincipal { get; set; }

        public decimal Interest { get; set; }

        public decimal TotalEstimatedAmount { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public int? CreatedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        public int? ModifiedBy { get; set; }

    }

    public class PropertyTimelineHistory
    {
        [Key]
        public int Id { get; set; }

        public int PropertyId { get; set; }

        public DateTime? Date { get; set; }

        public int? StatusId { get; set; }

        public string? UserId { get; set; }

        public string? Remarks { get; set; }
    }

}
