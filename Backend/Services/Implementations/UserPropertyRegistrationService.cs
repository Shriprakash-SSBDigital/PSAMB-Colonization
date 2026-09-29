using Backend.Data;
using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using Backend.Services.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace Backend.Services.Implementations
{
    public class UserPropertyRegistrationService: IUserPropertyRegistrationService
    {


        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        public UserPropertyRegistrationService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }
        private async Task<string> GeneratePropertyCode(int districtId, int mandiMarketId, int mandiId, int? plotNo)
        {
            var districtName = await _context.DistrictMasters.Where(x => x.DistrictId == districtId).Select(x => x.DistrictName).FirstOrDefaultAsync();

            var mandiMarketName = await _context.BranchMaster.Where(x => x.BranchId == mandiMarketId).Select(x => x.BranchName).FirstOrDefaultAsync();

            var mandiName = await _context.MandiMaster.Where(x => x.MandiId == mandiId).Select(x => x.MandiName).FirstOrDefaultAsync();

            var districtLetter = !string.IsNullOrEmpty(districtName) ? districtName.Substring(0, 1).ToUpper() : "";
            var mandimarketLetter = !string.IsNullOrEmpty(mandiMarketName) ? mandiMarketName.Substring(0, 1).ToUpper() : "";
            var mandiLetter = !string.IsNullOrEmpty(mandiName) ? mandiName.Substring(0, 1).ToUpper() : "";

            var lastCode = await _context.PropertyBidderRegistration.OrderByDescending(x => x.Id)
                .Select(x => x.PropertyCode)
                .FirstOrDefaultAsync();

            int series = 1;

            if (!string.IsNullOrEmpty(lastCode))
            {
                var lastSeries = int.Parse(lastCode.Split('-').Last());
                series = lastSeries + 1;
            }

            return $"{districtLetter}{mandimarketLetter}{mandiLetter}{plotNo}-{series}";
        }
        public async Task<ApiResponse<UserPropertyRegistrationDto>> UserPropertyRegisterAsync(UserPropertyRegistrationDto dto)
        {
            try
            {
                //if (string.IsNullOrEmpty(dto.PropertyCode))
                //{
                //    dto.PropertyCode = await GeneratePropertyCode(dto.DistrictId, dto.BranchId, dto.MandiId, dto.PlotNo);
                //}
                var data = _context.UserPropertyRegistration.Where(x => x.MandiId == dto.MandiId && x.PlotTypeId==dto.PlotTypeId
                                                                && x.PlotNo==dto.PlotNo && x.PlotSize == dto.PlotSize).FirstOrDefault();
                if (data != null)
                {
                    return ApiResponse<UserPropertyRegistrationDto>.Fail("Data already exists");
                }

                var entity = new Models.Entities.UserPropertyRegistration
                {
                    MandiId = dto.MandiId,
                    BranchId = dto.BranchId,
                    DistrictId = dto.DistrictId,
                    AllotteeCode = dto.PropertyCode,
                    PlotTypeId = dto.PlotTypeId,
                    CreatedBy = dto.ApplicantId ?? 0,
                    PlotSize = dto.PlotSize,
                    PlotNo = dto.PlotNo,
                    AllotteeName = dto.CurrentOwnerName,
                    AllotteeEmail = dto.Email,
                    AllotteeFatherName = dto.FatherHusbandName,
                    PanNumber = dto.PanNumber,
                    AadharNumber = dto.AadhaarNumber,
                    AllotteeMobileNo = dto.MobileNumber,
                    AllotteeStateId = dto.OwnerStateID,
                    AllotteeDistrictId = dto.OwnerDistrtictID,
                    AllotteeCityId = dto.OwnerCityID,
                    AllotteeAddress = dto.Address,
                    IsActive=true,
                    Status = 1,
                    CreatedDate= DateTime.UtcNow,
                    UploadAllotmentLetter = !string.IsNullOrWhiteSpace(dto.UploadAllotmentLetter) ? dto.UploadAllotmentLetter : null,
                    ReceiptDocument = !string.IsNullOrWhiteSpace(dto.ReceiptDocument) ? dto.ReceiptDocument : null,
                    UploadNoDuesCertificate = !string.IsNullOrWhiteSpace(dto.UploadNoDuesCertificate) ? dto.UploadNoDuesCertificate : null,
                    BForm = !string.IsNullOrWhiteSpace(dto.BForm) ? dto.BForm : null,
                    ConveyanceDeed = !string.IsNullOrWhiteSpace(dto.ConveyanceDeed) ? dto.ConveyanceDeed : null,
                    SaleDeed = !string.IsNullOrWhiteSpace(dto.SaleDeed) ? dto.SaleDeed : null,
                    TransferOrder = !string.IsNullOrWhiteSpace(dto.TransferOrder) ? dto.TransferOrder : null,
                    upload1 = !string.IsNullOrWhiteSpace(dto.Upload1) ? dto.Upload1 : null,
                    upload2 = !string.IsNullOrWhiteSpace(dto.Upload2) ? dto.Upload2 : null,
                };

                _context.UserPropertyRegistration.Add(entity);
                await _context.SaveChangesAsync();

                // Link uploaded documents from TempSessionId to ApplicantId
                if (dto.ApplicantId.HasValue && dto.ApplicantId.Value > 0)
                {
                    var applicantId = dto.ApplicantId.Value;
                    IQueryable<UserDocument>? docsQuery = null;

                    if (!string.IsNullOrWhiteSpace(dto.SessionId))
                    {
                        docsQuery = _context.UserDocuments.Where(d => d.TempSessionId == dto.SessionId && d.ApplicantId == null);
                    }
                    else if (dto.DocumentIds != null && dto.DocumentIds.Any())
                    {
                        docsQuery = _context.UserDocuments.Where(d => dto.DocumentIds.Contains(d.UserDocumentId) && d.ApplicantId == null);
                    }

                    if (docsQuery != null)
                    {
                        var docsToLink = await docsQuery.ToListAsync();
                        foreach (var doc in docsToLink)
                        {
                            doc.ApplicantId = applicantId;
                        }
                        if (docsToLink.Any())
                        {
                            await _context.SaveChangesAsync();
                        }
                    }
                }

                return ApiResponse<UserPropertyRegistrationDto>.Ok(dto, "Property registered successfully");
            }
            catch (Exception ex)
            {
                var message = ex.Message;
                if (ex.InnerException != null)
                {
                    message += " | Inner: " + ex.InnerException.Message;
                    if (ex.InnerException.InnerException != null)
                    {
                        message += " | Detail: " + ex.InnerException.InnerException.Message;
                    }
                }
                return ApiResponse<UserPropertyRegistrationDto>.Fail(message);
            }
        }

        public async Task<ApiResponse<List<PlotSizesDto>>> GetMandiPlotSizeByPlotNoAsync(int mandiId, int plotTypeId, string plotNo)
        {
            try
            {
                var result = new List<PlotSizesDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetMandiPlotSizebyPlotNo";
                command.CommandType = CommandType.StoredProcedure;

                var mandiParam = command.CreateParameter();
                mandiParam.ParameterName = "@MandiId";
                mandiParam.Value = mandiId;
                command.Parameters.Add(mandiParam);

                var plotTypeParam = command.CreateParameter();
                plotTypeParam.ParameterName = "@PlotTypeId";
                plotTypeParam.Value = plotTypeId;
                command.Parameters.Add(plotTypeParam);

                var plotNoParam = command.CreateParameter();
                plotNoParam.ParameterName = "@PlotNo";
                plotNoParam.Value = plotNo;
                command.Parameters.Add(plotNoParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    result.Add(new PlotSizesDto
                    {
                        PlotSize = reader["PlotSize"] == DBNull.Value ? null : reader["PlotSize"].ToString()
                    });
                }

                return ApiResponse<List<PlotSizesDto>>.Ok(  result,   result.Count > 0? "Plot size fetched successfully."  : "No plot size found."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotSizesDto>>.Fail(  $"Error while fetching plot size: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<UserPropertyRegistrationDto>>> GetPropertyOwnerVerificationAsync(string? userid, string? searchCode, int districtId, int branchId, int mandiid)
        {
            try
            {
                var result = new List<UserPropertyRegistrationDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetPropertyOwnerVerification";
                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.Add(
                     new SqlParameter("@UserId",
                         (object?)userid ?? DBNull.Value));

                command.Parameters.Add(
                    new SqlParameter("@SearchCode",
                        (object?)searchCode ?? DBNull.Value));

                command.Parameters.Add(
                    new SqlParameter("@DistrictId", districtId));

                command.Parameters.Add(
                    new SqlParameter("@BranchId", branchId));

                command.Parameters.Add(
                    new SqlParameter("@MandiId", mandiid));

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var dto = new UserPropertyRegistrationDto
                    {
                        // Property Information
                        Id = reader["Id"] == DBNull.Value
                            ? 0  : Convert.ToInt32(reader["Id"]),

                        PropertyCode = reader["PropertyCode"] == DBNull.Value
                            ? null  : reader["PropertyCode"].ToString(),

                        MandiId = reader["MandiId"] == DBNull.Value
                            ? 0 : Convert.ToInt32(reader["MandiId"]),

                        BranchId = reader["BranchId"] == DBNull.Value
                            ? 0: Convert.ToInt32(reader["BranchId"]),

                        DistrictId = reader["DistrictId"] == DBNull.Value
                            ? 0 : Convert.ToInt32(reader["DistrictId"]),

                        PlotTypeId = reader["PlotTypeId"] == DBNull.Value
                            ? null : Convert.ToInt32(reader["PlotTypeId"]),

                        PlotSize = reader["PlotSize"] == DBNull.Value
                            ? null : reader["PlotSize"].ToString(),

                        PlotNo = reader["PlotNo"] == DBNull.Value
                            ? null : Convert.ToInt32(reader["PlotNo"]),

                        // Owner Information
                        CurrentOwnerName = reader["AllotteeName"] == DBNull.Value
                            ? null : reader["AllotteeName"].ToString(),

                        FatherHusbandName = reader["AllotteeFatherName"] == DBNull.Value
                            ? null : reader["AllotteeFatherName"].ToString(),

                        MobileNumber = reader["AllotteeMobileNo"] == DBNull.Value
                            ? null: reader["AllotteeMobileNo"].ToString(),

                        Email = reader["AllotteeEmail"] == DBNull.Value
                            ? null: reader["AllotteeEmail"].ToString(),

                        OwnerStateID = reader["AllotteeStateId"] == DBNull.Value
                            ? null: Convert.ToInt32(reader["AllotteeStateId"]),

                        OwnerDistrtictID = reader["AllotteeDistrictId"] == DBNull.Value
                            ? null : Convert.ToInt32(reader["AllotteeDistrictId"]),

                        OwnerCityID = reader["AllotteeCityId"] == DBNull.Value
                            ? null : Convert.ToInt32(reader["AllotteeCityId"]),

                        Address = reader["AllotteeAddress"] == DBNull.Value
                            ? null : reader["AllotteeAddress"].ToString(),

                        AadhaarNumber = reader["AadharNumber"] == DBNull.Value
                            ? null: reader["AadharNumber"].ToString(),
                        // Master names
                        DistrictName = reader["DistrictName"] == DBNull.Value
                            ? null : reader["DistrictName"].ToString(),

                        BranchName = reader["BranchName"] == DBNull.Value
                            ? null : reader["BranchName"].ToString(),

                        MandiName = reader["MandiName"] == DBNull.Value
                             ? null: reader["MandiName"].ToString(),

                        PlotType = reader["PlotType"] == DBNull.Value
                             ? null : reader["PlotType"].ToString(),

                        PanNumber = reader["PanNumber"] == DBNull.Value  ? null: reader["PanNumber"].ToString(),

                        // Verification Status
                        Status =  reader["Status"] == DBNull.Value? null : Convert.ToInt32(reader["Status"]),

                        CreatedBy = reader["CreatedBy"] == DBNull.Value ? null : Convert.ToInt32(reader["CreatedBy"]),

                        CreatedDate = reader["CreatedDate"] == DBNull.Value  ? null : Convert.ToDateTime(reader["CreatedDate"]),
                        OwnerStateName = reader["OwnerState"] == DBNull.Value
                             ? null : reader["OwnerState"].ToString(),

                        OwnerDistrtictName = reader["OwnerDistrict"] == DBNull.Value
                             ? null : reader["OwnerDistrict"].ToString(),

                        OwnerCityName = reader["OwnerCity"] == DBNull.Value
                             ? null : reader["OwnerCity"].ToString(),

                        Remarks = reader["Remarks"] != DBNull.Value
                             ? reader["Remarks"].ToString() : null,

                        LevelId = reader["LevelId"] != DBNull.Value
                             ? reader["LevelId"].ToString() : null,

                        UploadAllotmentLetter =  reader["UploadAllotmentLetter"] != DBNull.Value
                             ? reader["UploadAllotmentLetter"].ToString() : null,

                        ReceiptDocument =  reader["ReceiptDocument"] != DBNull.Value
                             ? reader["ReceiptDocument"].ToString() : null,

                        UploadNoDuesCertificate = reader["UploadNoDuesCertificate"] != DBNull.Value
                             ? reader["UploadNoDuesCertificate"].ToString() : null,

                        BForm = reader["BForm"] != DBNull.Value
                             ? reader["BForm"].ToString() : null,

                        ConveyanceDeed =  reader["ConveyanceDeed"] != DBNull.Value
                             ? reader["ConveyanceDeed"].ToString() : null,

                        SaleDeed = reader["SaleDeed"] != DBNull.Value
                             ? reader["SaleDeed"].ToString() : null,

                        TransferOrder =  reader["TransferOrder"] != DBNull.Value
                             ? reader["TransferOrder"].ToString() : null,

                        Upload1 =  reader["upload1"] != DBNull.Value
                             ? reader["upload1"].ToString() : null,

                        Upload2 =  reader["upload2"] != DBNull.Value
                             ? reader["upload2"].ToString() : null,
                    };

                    result.Add(dto);
                }

                await reader.CloseAsync();

                return ApiResponse<List<UserPropertyRegistrationDto>>.Ok(result, "Property owner verification data fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<UserPropertyRegistrationDto>>.Fail( $"Error while fetching property owner verification data: {ex.Message}");
            }
        }

        private static bool HasColumn(DbDataReader reader, string columnName)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        public async Task<ApiResponse<bool>> VerifyByClerkForUser(ClerkVerificationDto dto)
        {
            try
            {
                var record = await _context.UserPropertyRegistration.FirstOrDefaultAsync(x => x.KnowyourPropertyAllotteeId == dto.Id);

                if (record == null)
                    return ApiResponse<bool>.Fail("Record not found");

                if (dto.Decision == "sendback" && string.IsNullOrWhiteSpace(dto.Remarks))
                    return ApiResponse<bool>.Fail("Remarks required for send back");

                string role = string.IsNullOrWhiteSpace(dto.Role) ? "Clerk" : dto.Role;

                if (role.Equals("Clerk", StringComparison.OrdinalIgnoreCase))
                {
                    if (record.Status == 2)
                        return ApiResponse<bool>.Fail("Already verified by clerk");

                    if (dto.Decision == "approve")
                    {
                        record.Status = 2;
                        record.LevelId = "Clerk";
                    }
                    else if (dto.Decision == "sendback")
                    {
                        record.Status = 7;
                        record.LevelId = "Clerk";
                        record.Remarks = dto.Remarks;
                    }
                    else
                    {
                        return ApiResponse<bool>.Fail("Invalid decision");
                    }
                }
                else if (role.Equals("Senior Assistant", StringComparison.OrdinalIgnoreCase))
                {
                    if (record.Status == 3)
                        return ApiResponse<bool>.Fail("Already verified by assistant");

                    if (dto.Decision == "approve")
                    {
                        record.Status = 3;
                        record.LevelId = "Senior Assistant";
                    }
                    else if (dto.Decision == "sendback")
                    {
                        record.Status = 7;
                        record.LevelId = "Senior Assistant";
                        record.Remarks = dto.Remarks;
                    }
                    else
                    {
                        return ApiResponse<bool>.Fail("Invalid decision");
                    }
                }
                else
                {
                    return ApiResponse<bool>.Fail("Invalid role for verification");
                }

                record.ModifiedBy = dto.ModifiedBy;
                record.ModifiedDate = DateTime.Now;

                await _context.SaveChangesAsync();

                return ApiResponse<bool>.Ok(true, "Action completed successfully");
            }
            catch (Exception ex)
            {
                var message = ex.Message;
                if (ex.InnerException != null)
                {
                    message += " | Inner: " + ex.InnerException.Message;
                    if (ex.InnerException.InnerException != null)
                    {
                        message += " | Detail: " + ex.InnerException.InnerException.Message;
                    }
                }
                return ApiResponse<bool>.Fail(message);
            }
        }

    }
}
