using Backend.Models.Entities;

namespace Backend.Models.DTOs
{
    public class FileUploadResponse
    {
        public int UserDocumentId { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public int DocumentCategoryId { get; set; }
        public int DocumentTypeId { get; set; }
        public string RelativePath { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
    }

    public class FileListResponse
    {
        public int Id { get; set; }
        public string OriginalName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string SizeFormatted { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class FileUploadRequest
    {
        public IFormFile File { get; set; } = default!;
        public int DocumentCategoryId { get; set; }
        public int DocumentTypeId { get; set; }
        public string? DocumentNumber { get; set; }

        public string SessionId { get; set; } = string.Empty;
    }
    public enum DocumentCategory
    {
        Photograph = 1,
        IdentityProof = 2,
        AddressProof = 3,
        PropertyDocument = 4
    }
    public class UserDocument
    {
        public int UserDocumentId { get; set; }
        public long? ApplicantId { get; set; }
        public string? TempSessionId { get; set; }
        public int DocumentCategoryId { get; set; }
        public int DocumentTypeId { get; set; }
        public string? DocumentNumber { get; set; }
        public string? OriginalFileName { get; set; }
        public string StoredFileName { get; set; } = string.Empty;
        public string? FileExtension { get; set; }
        public long FileSize { get; set; }
        public string RelativePath { get; set; } = string.Empty;
        public string FolderPath { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }

        public ApplicationUser? Applicant { get; set; }
    }
}
