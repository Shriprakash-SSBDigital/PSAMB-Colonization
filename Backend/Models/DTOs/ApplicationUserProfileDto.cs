namespace Backend.Models.DTOs
{
    public class ApplicationUserProfileDto
    {
        public long ApplicantId { get; set; }
        public string? IdentityUserId { get; set; }
        public int? CategoryId { get; set; }
        public int? Gender { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? FatherHusbandFirstName { get; set; }
        public string? FatherHusbandLastName { get; set; }
        public string? MotherFirstName { get; set; }
        public string? MotherLastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
        public string? PhotoPath { get; set; }

        public int? IdentDocTypeId { get; set; }
        public string? IdentDocNumber { get; set; }
        public string? IdentDocPath { get; set; }

        public string? PANNumber { get; set; }
        public string? PANDocPath { get; set; }

        public int? IndividualStateId { get; set; }
        public int? IndividualDistrictId { get; set; }
        public int? IndividualCityId { get; set; }

        public string? StateName { get; set; } = string.Empty;
        public string? DistrictName { get; set; } = string.Empty;
        public string? CityName { get; set; } = string.Empty;

        public string? IndividualPinCode { get; set; }
        public string? IndividualPlotStreetLandmark { get; set; }

        public int? AddrDocTypeId { get; set; }
        public string? AddrDocNumber { get; set; }
        public string? AddrDocPath { get; set; }

        public string? FirmName { get; set; }
        public string? GSTNumber { get; set; }
        public string? MandiPropertyCode { get; set; }
        public string? OfficePropertyPhotoPath { get; set; }
        public bool? IsSameAsIndividualAddress { get; set; }
        public int? BusinessStateId { get; set; }
        public int? BusinessDistrictId { get; set; }
        public int? BusinessCityId { get; set; }
        public string? BusinessPinCode { get; set; }
        public string? BusinessPlotStreetLandmark { get; set; }

        public bool IsDeleted { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public long? CreatedBy { get; set; }
    }

    public class UserProfileImageDto
    {
        public string? FileName { get; set; }

        public string? ContentType { get; set; }

        public string? FilePath { get; set; }

        public string? TempSessionId { get; set; }

        public string? Base64Image { get; set; }
    }

    public class UpdateUserProfileDto
    {
        public string? Name { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }

        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? AltMobile { get; set; }

        public string? FatherName { get; set; }
        public string? FatherHusbandFirstName { get; set; }
        public string? FatherHusbandLastName { get; set; }

        public string? MotherName { get; set; }
        public string? MotherFirstName { get; set; }
        public string? MotherLastName { get; set; }

        //public string? Address { get; set; }
        public string? IndividualPlotStreetLandmark { get; set; }

        //public string? State { get; set; }
        public int? IndividualStateId { get; set; }

        //public string? District { get; set; }
        public int? IndividualDistrictId { get; set; }

        //public string? City { get; set; }
        public int? IndividualCityId { get; set; }

        //public string? Pincode { get; set; }
        public string? IndividualPinCode { get; set; }
    }
}
