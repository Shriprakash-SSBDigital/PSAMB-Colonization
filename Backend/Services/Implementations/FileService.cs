using Backend.Data;
using Backend.Helpers;
using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Models.Settings;
using Backend.Repositories.Interfaces;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System;

namespace Backend.Services.Implementations
{
    public class FileService : IFileService
    {
        private readonly IUnitOfWork _uow;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<FileService> _logger;
        private readonly ApplicationDbContext _context;
        private readonly FileUploadSettings _settings;

        private readonly HashSet<string> _allowedExtensions =
            new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".pdf" };

        private readonly HashSet<string> _allowedContentTypes =
            new(StringComparer.OrdinalIgnoreCase)
            {
                "image/jpeg", "image/jpg", "image/png", "application/pdf"
            };

        public FileService(ApplicationDbContext context, IOptions<FileUploadSettings> settings)
        {
            _context = context;
            _settings = settings.Value;
        }

        public async Task<FileUploadResponse> UploadAsync(
            IFormFile file,
            int documentCategoryId,
            int documentTypeId,
            string? documentNumber,
            string sessionId)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("Please select a file.");

            if (string.IsNullOrWhiteSpace(sessionId))
                throw new ArgumentException("SessionId is required.");

            var maxFileSize = _settings.MaxFileSizeMB * 1024L * 1024L;
            if (file.Length > maxFileSize)
                throw new ArgumentException($"File size cannot exceed {_settings.MaxFileSizeMB} MB.");

            if (!Enum.IsDefined(typeof(DocumentCategory), documentCategoryId))
                throw new ArgumentException("Invalid document category.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowedExtensions.Contains(extension))
                throw new ArgumentException("Only JPG, JPEG, PNG and PDF files are allowed.");

            if (!_allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
                throw new ArgumentException("Invalid file type.");

            var category = (DocumentCategory)documentCategoryId;

            string categoryFolder = category switch
            {
                DocumentCategory.Photograph => "Photograph",
                DocumentCategory.IdentityProof => "IdentityProof",
                DocumentCategory.AddressProof => "AddressProof",
                DocumentCategory.PropertyDocument => "PropertyDocument",
                _ => throw new ArgumentException("Invalid document category.")
            };

            string documentTypeFolder = GetDocumentTypeFolder(documentCategoryId, documentTypeId);

            // Sanitize sessionId taaki path traversal na ho
            var safeSessionId = SanitizeFolderName(sessionId);

            // Final structure: RootPath/Category/DocumentType/SessionId/
            var userFolder = Path.Combine(
                _settings.RootPath,
                categoryFolder,
                documentTypeFolder,
                safeSessionId);

            Directory.CreateDirectory(userFolder);

            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(userFolder, storedFileName);

            await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            var folderPath = Path.Combine(categoryFolder, documentTypeFolder, safeSessionId)
                .Replace("\\", "/");

            var relativePath = $"{folderPath}/{storedFileName}";

            var document = new UserDocument
            {
                ApplicantId = null,
                TempSessionId = safeSessionId,
                DocumentCategoryId = documentCategoryId,
                DocumentTypeId = documentTypeId,
                DocumentNumber = documentNumber,
                OriginalFileName = Path.GetFileName(file.FileName),
                StoredFileName = storedFileName,
                FileExtension = extension,
                FileSize = file.Length,
                RelativePath = relativePath,
                FolderPath = folderPath,
                ContentType = file.ContentType,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
                IsDeleted = false
            };

            _context.UserDocuments.Add(document);
            await _context.SaveChangesAsync();

            return new FileUploadResponse
            {
                UserDocumentId = document.UserDocumentId,
                OriginalFileName = document.OriginalFileName ?? "",
                StoredFileName = document.StoredFileName,
                DocumentCategoryId = document.DocumentCategoryId,
                DocumentTypeId = document.DocumentTypeId,
                RelativePath = document.RelativePath,
                FileUrl = document.RelativePath
            };
        }

        public async Task LinkDocumentsToApplicantAsync(int applicantId, string sessionId, int?[] documentIds)
        {
            var ids = documentIds.Where(id => id.HasValue).Select(id => id!.Value).ToList();
            if (!ids.Any()) return;

            var docs = await _context.UserDocuments
                .Where(d => ids.Contains(d.UserDocumentId) && d.TempSessionId == sessionId)
                .ToListAsync();

            foreach (var doc in docs)
            {
                doc.ApplicantId = applicantId;
            }

            await _context.SaveChangesAsync();
        }

        private string GetDocumentTypeFolder(int categoryId, int documentTypeId)
        {
            if (categoryId == (int)DocumentCategory.Photograph)
            {
                return "Photograph";
            }

            if (categoryId == (int)DocumentCategory.IdentityProof)
            {
                return documentTypeId switch
                {
                    1 => "AadhaarCard",
                    2 => "VoterCard",
                    3 => "Passport",
                    4 => "GovernmentIssuedPhotoIDCard",   // Driving License etc.
                    _ => throw new ArgumentException("Invalid identity document type.")
                };
            }

            if (categoryId == (int)DocumentCategory.AddressProof)
            {
                return documentTypeId switch
                {
                    1 => "Passport",
                    2 => "ElectricityBill",
                    3 => "WaterBill",
                    4 => "RentAgreement",
                    5 => "RegistyDeed",   // aapke folder screenshot mein isi spelling se hai
                    _ => throw new ArgumentException("Invalid address document type.")
                };
            }

            if (categoryId == (int)DocumentCategory.PropertyDocument)
            {
                return documentTypeId switch
                {
                    1 => "AllotmentLetter",
                    2 => "LastPaymentReceipt",
                    3 => "NoDueCertificate",
                    4 => "BForm",
                    5 => "ConveyanceDeed",
                    6 => "SaleDeed",
                    7 => "TransferOrder",
                    8 => "LegalHeirCertificate",
                    _ => throw new ArgumentException("Invalid property document type.")
                };
            }

            throw new ArgumentException("Invalid document category.");
        }

        private string SanitizeFolderName(string input)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var clean = new string(input.Where(c => !invalid.Contains(c)).ToArray());
            return string.IsNullOrWhiteSpace(clean) ? "0" : clean;
        }
        public async Task DeleteAsync(int fileId, string userId)
        {
            var file = await _uow.Files.FirstOrDefaultAsync(
                f => f.Id == fileId && f.UserId == userId)
                ?? throw new KeyNotFoundException("File not found or access denied");

            if (File.Exists(file.FilePath))
                File.Delete(file.FilePath);

            file.IsDeleted = true;
            _uow.Files.Update(file);
            await _uow.SaveChangesAsync();

            _logger.LogInformation("File deleted: {FileId} by {UserId}", fileId, userId);
        }
    }
}
