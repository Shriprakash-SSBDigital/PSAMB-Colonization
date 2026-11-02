using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities
{
    public class UserPropertyRegistration
    {
       [Key]
       public int KnowyourPropertyAllotteeId { get; set; }

            // Property Information
       public string? AllotteeCode { get; set; }

       public int? DistrictId { get; set; }

       public int? BranchId { get; set; }

       public int? PropertyType { get; set; }

       public int? MandiId { get; set; }
       public int? MandiCategoryId { get; set; }

       public int? PlotTypeId { get; set; }
       public int? PropertyCategory { get; set; }

       public int? PropertySubCategoryId { get; set; }

       public int? AssetSizeId { get; set; }

       public int? AssetID { get; set; }

        // Allottee Details
       public int? AllotteeId { get; set; }

       public string? AllotteeName { get; set; }

       public string? AllotteeFatherName { get; set; }

       public string? AllotteeAddress { get; set; }

       public string? AllotteeMobileNo { get; set; }

       public string? AllotteeEmail { get; set; }

       public int? AllotteeStateId { get; set; }

       public int? AllotteeDistrictId { get; set; }

       public int? AllotteeCityId { get; set; }

       public int? Share { get; set; }

        // Documents
       public string? AllotteeIDProof { get; set; }

       public string? IdProofDoc { get; set; }

       public string? UploadAllotmentLetter { get; set; }

       public bool NOC { get; set; }

       public string? UploadNoDuesCertificate { get; set; }

         // Payment / Receipt Details
       public DateTime? ReceiptDate { get; set; }

       public int? PaymentModeId { get; set; }

       public string? PaymentMode { get; set; }

       public string? PaymentChallanId { get; set; }

       public string? ReceiptNumber { get; set; }

       public string? TotalPaidAmount { get; set; }

       // Status
       public int? Status { get; set; }

       public string? LevelId { get; set; }

        // Common Audit Fields
       public bool? IsActive { get; set; }

       public bool? IsDeleted { get; set; }

       public long? CreatedBy { get; set; }

       public DateTime? CreatedDate { get; set; }

       public string? ModifiedBy { get; set; }

       public DateTime? ModifiedDate { get; set; }

       public string? Remarks { get; set; }

        // Uploaded Documents
       public string? ReceiptDocument { get; set; }

       public string? BForm { get; set; }

       public string? ConveyanceDeed { get; set; }

       public string? SaleDeed { get; set; }

       public string? TransferOrder { get; set; }

       public string? upload1 { get; set; }

       public string? upload2 { get; set; }

        // Identity Details
       public string? AadharNumber { get; set; }

       public string? PassportNumber { get; set; }

       public string? PassportDocument { get; set; }
        public string? PanNumber { get; set; }

        public string? PanDocument { get; set; }
        public string? PlotSize { get; set; }
        public int? PlotNo { get; set; }

    }
}
