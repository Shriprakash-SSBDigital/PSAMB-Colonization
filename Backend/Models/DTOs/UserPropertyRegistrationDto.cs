using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class UserPropertyRegistrationDto
    {

        public int Id { get; set; }
        public string? PropertyCode { get; set; }
        public int? PropertyId { get; set; }

        public int MandiId { get; set; }
        public int BranchId { get; set; }
        public int DistrictId { get; set; }
        public int? PlotTypeId { get; set; }
        public int? PlanId { get; set; }
        public string? PlotSize { get; set; }
        public int? PlotNo { get; set; }
        public int? ApplicantId { get; set; }
        public string? CurrentOwnerName { get; set; }
        public string? FatherHusbandName { get; set; }

        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public int? OwnerStateID { get; set; }
        public int? OwnerDistrtictID { get; set; }
        public int? OwnerCityID { get; set; }
        public string? Address { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? PanNumber { get; set; }
        public int? Status { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public string? DistrictName { get; set; }
        public string? BranchName { get; set; }
        public string? MandiName { get; set; }
        public string? PlotType { get; set; }

        public string? OwnerStateName { get; set; }
        public string? OwnerDistrtictName { get; set; }
        public string? OwnerCityName { get; set; }
        public string? Remarks { get; set; }
        public string? LevelId { get; set; }

        // Uploaded Documents
        public string? UploadAllotmentLetter { get; set; }
        public string? ReceiptDocument { get; set; }
        public string? UploadNoDuesCertificate { get; set; }
        public string? BForm { get; set; }
        public string? ConveyanceDeed { get; set; }
        public string? SaleDeed { get; set; }
        public string? TransferOrder { get; set; }
        public string? Upload1 { get; set; }
        public string? Upload2 { get; set; }

        public string? SessionId { get; set; }
        public List<int>? DocumentIds { get; set; }
        public string? StatusName { get; set; }

    }

    public class PlotSizesDto
    {
        public string? PlotSize { get; set; }
    }
}
