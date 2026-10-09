using Azure;
using Backend.Data;
using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using static Backend.Models.Dtos.DistrictMasterDto;

namespace Backend.Services.Implementations
{
    public class PropertyBidderRegistration : IPropertyBidderRegistration
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        public PropertyBidderRegistration(ApplicationDbContext context, IConfiguration config)
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

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> RegisterPropertyAsync(PropertyBidderRegistrationDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.PropertyCode))
                {
                    dto.PropertyCode = await GeneratePropertyCode(dto.DistrictId, dto.BranchId, dto.MandiId, dto.PlotNo);
                }
                var data = _context.PropertyBidderRegistration.Where(x => x.PropertyCode == dto.PropertyCode).FirstOrDefault();
                if (data != null)
                {
                    return ApiResponse<PropertyBidderRegistrationDto>.Fail("Data already digitized");
                }

                var entity = new Models.Entities.PropertyBidderRegistration
                {
                    MandiId = dto.MandiId,
                    BranchId = dto.BranchId,
                    DistrictId = dto.DistrictId,
                    PropertyCode = dto.PropertyCode,
                    PlotTypeId = dto.PlotTypeId,
                    ApplicantId = dto.ApplicantId??0,
                    PlanId = dto.PlanId,
                    PlotSize = dto.PlotSize,
                    PlotNo = dto.PlotNo,
                    AssetResumed = dto.AssetResumed ?? false,
                    AssetSurrendered = dto.AssetSurrendered ?? false,
                    IsAssetLocked = dto.IsAssetLocked ?? false,
                    IsDefaulter = dto.IsDefaulter ?? false,
                    AnyComplaint = dto.AnyComplaint ?? false,
                    NdcGenerated = dto.NdcGenerated ?? false,
                    NdcIssued = dto.NdcIssued ?? false,
                    AssetVerified = dto.AssetVerified ?? false,
                    IsAuctioned = dto.IsAuctioned ?? false,
                    IsCourtCase = dto.IsCourtCase ?? false,
                    AuctionDate = dto.AuctionDate,
                    BidderTypeId = dto.BidderTypeId,
                    BidderName = dto.BidderName,
                    Email = dto.Email,
                    IsTransferred = dto.IsTransferred ?? false,
                    Relation = dto.Relation,
                    FatherOrHusbandName = dto.FatherOrHusbandName,
                    PANNo = dto.PANNo,
                    AadhaarNo = dto.AadhaarNo,
                    MobileNo = dto.MobileNo,
                    PropertyTypeId = dto.PropertyTypeId,
                    Address = dto.Address,
                    ReservePrice = dto.ReservePrice,
                    FinalBidPrice = dto.FinalBidPrice,
                    AllotmentDate = dto.AllotmentDate,
                    FormTransactionId = dto.FormTransactionId,
                    FormTxnDate = dto.FormTxnDate,
                    FormPaidAmount = dto.FormPaidAmount,
                    EmdTxnId = dto.EmdTxnId,
                    EmdDate = dto.EmdDate,
                    EmdAmount = dto.EmdAmount,
                    AllotmentTxnId = dto.AllotmentTxnId,
                    AllotmentTransactionDate = dto.AllotmentTransactionDate,
                    AllotmentAmount = dto.AllotmentAmount,
                    DueAmount = dto.DueAmount,
                    TotalDueWithInterest = dto.TotalDueWithInterest,
                    ApplicationStatusId = 1,
                    PlotStatus = dto.PlotStatus,
                    PropertyCategoryId = dto.PropertyCategoryId ?? 0,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = dto.CreatedBy ?? dto.ApplicantId ?? 0,
                    OwnerStateID= dto.OwnerStateID,
                    OwnerDistrtictID=dto.OwnerDistrtictID,
                    OwnerCityID=dto.OwnerCityID
                };

                _context.PropertyBidderRegistration.Add(entity);
                await _context.SaveChangesAsync();

                dto.Id = entity.Id;

                var installmentsList = dto.Installments;
                if (installmentsList != null && installmentsList.Any())
                {
                    var installments = installmentsList.Select(i => new Models.Entities.InstallmentDetails
                    {
                        ReceiptNo = i.ReceiptNo,
                        ReceiptDate = i.ReceiptDate,
                        DraftNo = i.DraftNo,
                        DraftAmount = i.DraftAmount ?? 0,
                        DraftDate = i.DraftDate,
                        DraftBank = i.DraftBank,
                        Principal = i.PrincipalAmount ?? 0,
                        Interest = i.InterestAmount ?? 0,
                        OtherAmount = i.OtherAmount ?? 0,
                        PenaltyAmount = i.PenaltyAmount ?? 0,
                        Type = i.PenaltyType,
                        Remarks = i.Remarks,
                        ApplicantId = entity.ApplicantId,
                        PropertyId = entity.Id,
                        IsVerified = i.IsVerified ?? false
                    }).ToList();

                    _context.InstallmentDetails.AddRange(installments);
                    await _context.SaveChangesAsync();

                }

                var installmentSchedulesList = dto.InstallmentSchedules;
                if (installmentSchedulesList != null && installmentSchedulesList.Any())
                {
                    var schedules = installmentSchedulesList.Select(s => new Models.Entities.InstallmentSchedule
                    {
                        PropertyId = entity.Id,
                        PropertyCode = entity.PropertyCode,
                        InstallmentNo = s.InstallmentNo,
                        CalculatedDueDate = s.CalculatedDueDate,
                        BasePrincipal = s.BasePrincipal ?? 0,
                        Interest = s.Interest ?? 0,
                        TotalEstimatedAmount = s.TotalEstimatedAmount ?? 0,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedDate = DateTime.UtcNow,
                        CreatedBy = (int?)(dto.CreatedBy ?? dto.ApplicantId ?? 0)
                    }).ToList();

                    _context.InstallmentSchedule.AddRange(schedules);
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(dto, "Property registered successfully");
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
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(message);
            }
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> GetRegistrationByIdAsync(int id)
        {
            try
            {
                var registration = await _context.PropertyBidderRegistration
                    .AsNoTracking()
                    .Where(x => x.Id == id && x.IsActive && !x.IsDeleted)
                    .Select(x => new PropertyBidderRegistrationDto
                    {
                        Id = x.Id,
                        MandiId = x.MandiId,
                        BranchId = x.BranchId,
                        DistrictId = x.DistrictId,
                        ApplicantId = x.ApplicantId,
                        PlotTypeId = x.PlotTypeId,
                        PlanId = x.PlanId,
                        PlotSize = x.PlotSize,
                        PropertyCode = x.PropertyCode,
                        PlotNo = x.PlotNo,
                        AssetResumed = x.AssetResumed,
                        AssetSurrendered = x.AssetSurrendered,
                        IsAssetLocked = x.IsAssetLocked,
                        IsDefaulter = x.IsDefaulter,
                        AnyComplaint = x.AnyComplaint,
                        NdcGenerated = x.NdcGenerated,
                        IsCourtCase = x.IsCourtCase,
                        NdcIssued = x.NdcIssued,
                        AssetVerified = x.AssetVerified,
                        IsAuctioned = x.IsAuctioned,
                        AuctionDate = x.AuctionDate,
                        BidderTypeId = x.BidderTypeId,
                        BidderName = x.BidderName,
                        Email = x.Email,
                        IsTransferred = x.IsTransferred,
                        Relation = x.Relation,
                        FatherOrHusbandName = x.FatherOrHusbandName,
                        PANNo = x.PANNo,
                        AadhaarNo = x.AadhaarNo,
                        MobileNo = x.MobileNo,
                        PropertyTypeId = x.PropertyTypeId,
                        Address = x.Address,
                        ReservePrice = x.ReservePrice,
                        FinalBidPrice = x.FinalBidPrice,
                        AllotmentDate = x.AllotmentDate,
                        FormTransactionId = x.FormTransactionId,
                        FormTxnDate = x.FormTxnDate,
                        FormPaidAmount = x.FormPaidAmount,
                        EmdTxnId = x.EmdTxnId,
                        EmdDate = x.EmdDate,
                        EmdAmount = x.EmdAmount,
                        AllotmentTxnId = x.AllotmentTxnId,
                        AllotmentTransactionDate = x.AllotmentTransactionDate,
                        AllotmentAmount = x.AllotmentAmount,
                        DueAmount = x.DueAmount,
                        TotalDueWithInterest = x.TotalDueWithInterest,
                        ApplicationStatusId = x.ApplicationStatusId,
                        PlotStatus = x.PlotStatus,
                        PropertyCategoryId = x.PropertyCategoryId,
                        DistrictName = x.District != null ? x.District.DistrictName : "",
                        BranchName = x.Branch != null ? x.Branch.BranchName : "",
                        MandiName = x.Mandi != null ? x.Mandi.MandiName : "",
                        Remarks=x.Remarks,
                        OwnerStateID=x.OwnerStateID,
                        OwnerDistrtictID=x.OwnerDistrtictID,
                        OwnerCityID=x.OwnerCityID

                    })
                    .FirstOrDefaultAsync();

                if (registration == null)
                {
                    return ApiResponse<PropertyBidderRegistrationDto>.Fail("Registration not found");
                }

                var installments = await _context.InstallmentDetails
                    .AsNoTracking()
                    .Where(i => i.PropertyId == id)
                    .Select(i => new InstallmentDetailsDto
                    {
                        Id = i.Id,
                        ReceiptNo = i.ReceiptNo,
                        ReceiptDate = i.ReceiptDate,
                        DraftNo = i.DraftNo,
                        DraftAmount = i.DraftAmount,
                        DraftDate = i.DraftDate,
                        DraftBank = i.DraftBank,
                        PrincipalAmount = i.Principal,
                        InterestAmount = i.Interest,
                        OtherAmount = i.OtherAmount,
                        PenaltyAmount = i.PenaltyAmount,
                        PenaltyType = i.Type,
                        Remarks = i.Remarks,
                        ApplicantId = i.ApplicantId,
                        PropertyId = i.PropertyId,
                        IsVerified = i.IsVerified
                    })
                    .ToListAsync();

                registration.Installments = installments;

                var schedules = await _context.InstallmentSchedule
                    .AsNoTracking()
                    .Where(s => s.PropertyId == id && !s.IsDeleted)
                    .OrderBy(s => s.InstallmentNo)
                    .Select(s => new InstallmentScheduleDto
                    {
                        Id = s.Id,
                        PropertyId = s.PropertyId,
                        PropertyCode = s.PropertyCode,
                        InstallmentNo = s.InstallmentNo,
                        CalculatedDueDate = s.CalculatedDueDate,
                        BasePrincipal = s.BasePrincipal,
                        Interest = s.Interest,
                        TotalEstimatedAmount = s.TotalEstimatedAmount,
                        IsActive = s.IsActive
                    })
                    .ToListAsync();

                registration.InstallmentSchedules = schedules;

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(registration, "Registration fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> GetRegistrationByPropertyCodeAsync(string propertyCode)
        {
            try
            {
                var registration = await (
                       from x in _context.PropertyBidderRegistration.AsNoTracking()
                     
                       join mandi in _context.MandiMaster.AsNoTracking()
                           on x.MandiId equals mandi.MandiId
                     
                       join branch in _context.BranchMaster.AsNoTracking()
                           on x.BranchId equals branch.BranchId
                     
                       where x.PropertyCode == propertyCode
                             && x.IsActive
                             && !x.IsDeleted
                     
                       select new PropertyBidderRegistrationDto
                       {
                           Id = x.Id,
                     
                           MandiId = x.MandiId,
                           MandiName = mandi.MandiName,
                     
                           BranchId = x.BranchId,
                           BranchName = branch.BranchName,
                     
                           DistrictId = x.DistrictId,
                     
                           PropertyCode = x.PropertyCode,
                           ApplicantId = x.ApplicantId,
                     
                           PlotTypeId = x.PlotTypeId,
                           PlanId = x.PlanId,
                           PlotSize = x.PlotSize,
                           PlotNo = x.PlotNo,
                     
                           AssetResumed = x.AssetResumed,
                           AssetSurrendered = x.AssetSurrendered,
                           IsAssetLocked = x.IsAssetLocked,
                           IsDefaulter = x.IsDefaulter,
                           AnyComplaint = x.AnyComplaint,
                           NdcGenerated = x.NdcGenerated,
                           NdcIssued = x.NdcIssued,
                           AssetVerified = x.AssetVerified,
                           IsCourtCase = x.IsCourtCase,
                     
                           IsAuctioned = x.IsAuctioned,
                           AuctionDate = x.AuctionDate,
                     
                           BidderTypeId = x.BidderTypeId,
                           BidderName = x.BidderName,
                           Email = x.Email,
                           IsTransferred = x.IsTransferred,
                     
                           Relation = x.Relation,
                           FatherOrHusbandName = x.FatherOrHusbandName,
                           PANNo = x.PANNo,
                           AadhaarNo = x.AadhaarNo,
                           MobileNo = x.MobileNo,
                     
                           PropertyTypeId = x.PropertyTypeId,
                           Address = x.Address,
                     
                           ReservePrice = x.ReservePrice,
                           FinalBidPrice = x.FinalBidPrice,
                     
                           FormTransactionId = x.FormTransactionId,
                           FormTxnDate = x.FormTxnDate,
                           FormPaidAmount = x.FormPaidAmount,
                     
                           EmdTxnId = x.EmdTxnId,
                           EmdDate = x.EmdDate,
                           EmdAmount = x.EmdAmount,
                     
                           AllotmentTxnId = x.AllotmentTxnId,
                           AllotmentDate = x.AllotmentDate,
                           AllotmentTransactionDate = x.AllotmentTransactionDate,
                           AllotmentAmount = x.AllotmentAmount,
                     
                           DueAmount = x.DueAmount,
                           TotalDueWithInterest = x.TotalDueWithInterest,
                     
                           ApplicationStatusId = x.ApplicationStatusId,
                           PlotStatus = x.PlotStatus,
                           PropertyCategoryId = x.PropertyCategoryId,
                     
                           OwnerStateID = x.OwnerStateID,
                           OwnerDistrtictID = x.OwnerDistrtictID,
                           OwnerCityID = x.OwnerCityID,
                           Remarks=x.Remarks
                       }
                       ).FirstOrDefaultAsync();

                if (registration == null)
                {
                    return ApiResponse<PropertyBidderRegistrationDto>.Fail("no record found");
                }

                var installments = await _context.InstallmentDetails
                    .AsNoTracking()
                    .Where(i => i.PropertyId == registration.Id)
                    .Select(i => new InstallmentDetailsDto
                    {
                        Id = i.Id,
                        ReceiptNo = i.ReceiptNo,
                        ReceiptDate = i.ReceiptDate,
                        DraftNo = i.DraftNo,
                        DraftAmount = i.DraftAmount,
                        DraftDate = i.DraftDate,
                        DraftBank = i.DraftBank,
                        PrincipalAmount = i.Principal,
                        InterestAmount = i.Interest,
                        OtherAmount = i.OtherAmount,
                        PenaltyAmount = i.PenaltyAmount,
                        PenaltyType = i.Type,
                        Remarks = i.Remarks,
                        ApplicantId = i.ApplicantId,
                        PropertyId = i.PropertyId,
                        IsVerified = i.IsVerified
                    })
                    .ToListAsync();
                registration.Installments = installments;

                var schedules = await _context.InstallmentSchedule
                    .AsNoTracking()
                    .Where(s => s.PropertyId == registration.Id && !s.IsDeleted)
                    .OrderBy(s => s.InstallmentNo)
                    .Select(s => new InstallmentScheduleDto
                    {
                        Id = s.Id,
                        PropertyId = s.PropertyId,
                        PropertyCode = s.PropertyCode,
                        InstallmentNo = s.InstallmentNo,
                        CalculatedDueDate = s.CalculatedDueDate,
                        BasePrincipal = s.BasePrincipal,
                        Interest = s.Interest,
                        TotalEstimatedAmount = s.TotalEstimatedAmount,
                        IsActive = s.IsActive
                    })
                    .ToListAsync();

                registration.InstallmentSchedules = schedules;

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(registration, "Registration fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> GetPropertyEAuctionDetailsByPropertyCodeAsync(string propertyCode, bool isSold = false)
        {
            try
            {
                var connection = (SqlConnection)_context.Database.GetDbConnection();

                await connection.OpenAsync();

                using var command = new SqlCommand("SP_GetPropertyEauctionDetailsByPropertyCode", connection);

                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.AddWithValue(
                    "@PropertyCode",
                    propertyCode);
                command.Parameters.AddWithValue(
                    "@IsPropertySold",
                    isSold);

                using var adapter = new SqlDataAdapter(command);

                var dataSet = new DataSet();

                adapter.Fill(dataSet);
                // Create response for checking
                var response = new PropertyBidderRegistrationDto();

                if (dataSet.Tables.Count > 0 && dataSet.Tables[0].Rows.Count > 0)
                {
                    var table = dataSet.Tables[0];
                    var row = table.Rows[0];

                    response.Id = row["PropertyId"] != DBNull.Value
                        ? Convert.ToInt32(row["PropertyId"])
                        : 0;

                    response.PropertyCode = row["PropertyCode"]?.ToString();

                    response.MandiId = row["MandiId"] != DBNull.Value
                        ? Convert.ToInt32(row["MandiId"])
                        : 0;

                    response.BranchId = row["BranchId"] != DBNull.Value
                        ? Convert.ToInt32(row["BranchId"])
                        : 0;

                    response.DistrictId = row["DistrictId"] != DBNull.Value
                        ? Convert.ToInt32(row["DistrictId"])
                        : 0;

                    response.PlotTypeId = row["PlotTypeId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotTypeId"])
                        : null;

                    response.PlanId = row["PlanId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlanId"])
                        : null;

                    response.PlanName = table.Columns.Contains("PlanName") && row["PlanName"] != DBNull.Value
                        ? row["PlanName"].ToString()
                        : null;

                    response.PlotSize = row["PlotSize"] != DBNull.Value
                        ? Convert.ToString(row["PlotSize"])
                        : null;

                    response.PlotNo = row["PlotNo"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotNo"])
                        : null;

                    response.PlotStatus = row["PropertyStatus"] != DBNull.Value
                      ? Convert.ToString(row["PropertyStatus"])
                      : null;
                    response.AssetVerified =
                            row["IsAssetVerified"] != DBNull.Value
                                ? Convert.ToBoolean(row["IsAssetVerified"])
                                : null;

                    response.NdcGenerated =
                        row["IsNDCGenerated"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCGenerated"])
                            : null;

                    response.NdcIssued =
                        row["IsNDCIssued"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCIssued"])
                            : null;

                    response.AnyComplaint =
                        row["IsAnyComplaint"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAnyComplaint"])
                            : null;

                    response.IsDefaulter =
                        row["IsDefaulter"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsDefaulter"])
                            : null;

                    response.AssetSurrendered =
                        row["IsAssetSurrendered"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetSurrendered"])
                            : null;

                    response.IsAssetLocked =
                        row["IsLocked"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsLocked"])
                            : null;

                    response.AssetResumed =
                        row["IsAssetResumed"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetResumed"])
                            : null;
                    response.IsAuctioned =row["IsAssetAuctioned"] != DBNull.Value? Convert.ToBoolean(row["IsAssetAuctioned"]) : null;

                    response.PropertyCategoryId =
                      row["PropertyCategoryId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyCategoryId"])
                          : null;
                    response.PropertyTypeId =
                      row["PropertyTypeId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyTypeId"])
                          : null;

                    response.DistrictName =
                   row["DistrictName"] != DBNull.Value
                       ? Convert.ToString(row["DistrictName"])
                       : null;

                    //response.BranchName = row["BranchName"] != DBNull.Value
                    //                    ? Convert.ToString(row["BranchName"])
                    //                    : null;

                    response.MandiName =
                     row["MandiName"] != DBNull.Value
                         ? Convert.ToString(row["MandiName"])
                         : null;

                    //response.BidderTypeId =
                    //  row["BiddingType"] != DBNull.Value
                    //      ? Convert.ToInt32(row["BiddingType"])
                    //      : null;

                }

               
                // Allottee Details 
                if (dataSet.Tables.Count > 1 &&
                    dataSet.Tables[1].Rows.Count > 0)
                {
                    var row = dataSet.Tables[1].Rows[0];
                    response.BidderName = row["AllotteeName"] != DBNull.Value
                            ? row["AllotteeName"]?.ToString()
                           : null;

                    response.Email =
                        row["EmailId"] != DBNull.Value
                            ? row["EmailId"]?.ToString()
                            : null;



                    // =====================================
                    // Personal Details
                    // =====================================

                    //response.Relation =
                    //    row["Relation"] != DBNull.Value
                    //        ? row["Relation"]?.ToString()
                    //        : null;

                    response.FatherOrHusbandName =
                        row["AllotteeFatherName"] != DBNull.Value
                            ? row["AllotteeFatherName"]?.ToString()
                            : null;

                    response.PANNo =
                        row["PanNumber"] != DBNull.Value
                            ? row["PanNumber"]?.ToString()
                            : null;

                    //response.AadhaarNo =
                    //    row["DocumentNumber"] != DBNull.Value
                    //        ? row["DocumentNumber"]?.ToString()
                    //        : null;

                    response.MobileNo =
                        row["MobileNo"] != DBNull.Value
                            ? row["MobileNo"]?.ToString()
                            : null;

                    // Owner Details
                    response.OwnerStateID =
                        row["StateId"] != DBNull.Value
                            ? Convert.ToInt32(row["StateId"])
                            : null;

                    response.OwnerDistrtictID =
                        row["DistrictId"] != DBNull.Value
                            ? Convert.ToInt32(row["DistrictId"])
                            : null;

                    response.OwnerCityID =
                        row["CityId"] != DBNull.Value
                            ? Convert.ToInt32(row["CityId"])
                            : null;

                    response.Address =
                        row["AllotteeAddress"] != DBNull.Value
                            ? row["AllotteeAddress"]?.ToString()
                            : null;
                }
                // =====================================
                // TABLE 2 - PropertyAuctionDetail
                // =====================================

                if (dataSet.Tables.Count > 2 &&
                    dataSet.Tables[2].Rows.Count > 0)
                {
                    var row = dataSet.Tables[2].Rows[0];
                    response.AuctionDate =
                      row["AuctionDate"] != DBNull.Value
                          ? Convert.ToDateTime(row["AuctionDate"])
                          : null;
                    // Financial Details
                    response.ReservePrice =
                        row["ReservePrice"] != DBNull.Value
                            ? Convert.ToDecimal(row["ReservePrice"])
                            : null;

                    response.FinalBidPrice =
                        row["SalesAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["SalesAmount"])
                            : null;


                    // EMD
                    //response.EmdTxnId =
                    //    row["EmdTxnId"] != DBNull.Value
                    //        ? row["EmdTxnId"]?.ToString()
                    //        : null;

                    //response.EmdDate =
                    //    row["EmdDate"] != DBNull.Value
                    //        ? Convert.ToDateTime(row["EmdDate"])
                    //        : null;

                    //response.EmdAmount =
                    //    row["EmdAmount"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["EmdAmount"])
                    //        : null;


                    // 25% Allotment
                    //response.AllotmentTxnId =
                    //    row["AllotmentTxnId"] != DBNull.Value
                    //        ? row["AllotmentTxnId"]?.ToString()
                    //        : null;

                    response.AllotmentDate =
                        row["DateOfAllotment"] != DBNull.Value
                            ? Convert.ToDateTime(row["DateOfAllotment"])
                            : null;

                    //response.AllotmentAmount =
                    //    row["AllotmentAmount"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["AllotmentAmount"])
                    //        : null;


                    // Outstanding
                    response.DueAmount =
                        row["BalanceAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["BalanceAmount"])
                            : null;

                    //response.TotalDueWithInterest =
                    //    row["TotalDueWithInterest"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["TotalDueWithInterest"])
                    //        : null;


                    // Remarks
                    //response.Remarks =
                    //    row["Remarks"] != DBNull.Value
                    //        ? row["Remarks"]?.ToString()
                    //        : null;
                }


                response.InstallmentSchedules = new List<InstallmentScheduleDto>();

                if (dataSet.Tables.Count > 3 &&
                    dataSet.Tables[3].Rows.Count > 0)
                {
                    var table = dataSet.Tables[3];

                    foreach (DataRow row in table.Rows)
                    {
                        var schedule = new InstallmentScheduleDto
                        {

                            Id = row["InstallmentId"] != DBNull.Value
                                ? Convert.ToInt32(row["InstallmentId"])
                                : 0,

                            PropertyId = row["PropertyId"] != DBNull.Value
                                ? Convert.ToInt32(row["PropertyId"])
                                : 0,

                            PropertyCode = row["AllotteeCode"] != DBNull.Value
                                ? row["AllotteeCode"]?.ToString()
                                : null,

                            InstallmentNo = row["InstallmentNo"] != DBNull.Value
                                ? Convert.ToString(row["InstallmentNo"])
                                : null,

                            CalculatedDueDate = row["DueDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DueDate"])
                                : null,

                            BasePrincipal = row["DueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DueAmount"])
                                : 0,

                            Interest = row["Interest"] != DBNull.Value
                                ? Convert.ToDecimal(row["Interest"])
                                : 0,

                            TotalEstimatedAmount = row["TotalDueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["TotalDueAmount"])
                                : 0
                        };

                        response.InstallmentSchedules.Add(schedule);
                    }
                }
                // =====================================
                // TABLE 5 - PropertyInstallmentDetails
                // =====================================

                response.Installments = new List<InstallmentDetailsDto>();

                if (dataSet.Tables.Count > 5 &&
                    dataSet.Tables[5].Rows.Count > 0)
                {
                    var table = dataSet.Tables[5];

                    foreach (DataRow row in table.Rows)
                    {
                        var installment = new InstallmentDetailsDto
                        {
                            Id = row["DraftId"] != DBNull.Value
                                ? Convert.ToInt32(row["DraftId"])
                                : 0,

                            ReceiptNo = row["ReceiptNo"] != DBNull.Value
                                ? row["ReceiptNo"]?.ToString()
                                : null,

                            ReceiptDate = row["ReceiptDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["ReceiptDate"])
                                : null,

                            DraftNo = row["DraftNo"] != DBNull.Value
                                ? row["DraftNo"]?.ToString()
                                : null,

                            DraftAmount = row["DraftAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DraftAmount"])
                                : null,

                            DraftDate = row["DraftDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DraftDate"])
                                : null,

                            DraftBank = row["ChallanBank"] != DBNull.Value
                                ? row["DraftBankId"]?.ToString()
                                : null,

                            PrincipalAmount = row["PrincipalAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PrincipalAmount"])
                                : null,

                            InterestAmount = row["InterestAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["InterestAmount"])
                                : null,

                            OtherAmount = row["OtherAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["OtherAmount"])
                                : null,

                            PenaltyAmount = row["PenalityAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PenalityAmount"])
                                : null,

                            PenaltyType = row["PenalityTypeId"] != DBNull.Value
                                ? row["PenalityTypeId"]?.ToString()
                                : null,

                            Remarks = row["Remarks"] != DBNull.Value
                                ? row["Remarks"]?.ToString()
                                : null,


                            //IsVerified = row["IsVerified"] != DBNull.Value
                            //    ? Convert.ToBoolean(row["IsVerified"])
                            //    : null
                        };

                        response.Installments.Add(installment);
                    }
                }

                if (dataSet.Tables.Count > 6 && dataSet.Tables[6].Rows.Count > 0)
                {
                    var row = dataSet.Tables[6].Rows[0];
                    // Form Fee
                    response.FormTransactionId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.FormTxnDate =
                        row["ReceiptDate"] != DBNull.Value
                            ? Convert.ToDateTime(row["ReceiptDate"])
                            : null;

                    response.FormPaidAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }
                if (dataSet.Tables.Count > 7 && dataSet.Tables[7].Rows.Count > 0)
                {
                    var row = dataSet.Tables[7].Rows[0];
                    // Form Fee
                    response.AllotmentTxnId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.AllotmentTransactionDate =
                        row["ReceiptDate"] != DBNull.Value
                            ? Convert.ToDateTime(row["ReceiptDate"])
                            : null;

                    response.AllotmentAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }
                var existingRegistration = await _context.PropertyBidderRegistration
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.PropertyCode == propertyCode && x.IsActive && !x.IsDeleted);

                if (existingRegistration != null)
                {
                    response.Id = existingRegistration.Id;
                }
                response.InstallmentCalculations = new List<InstallmentCalculationDto>();

                if (response.InstallmentSchedules.Count > 0 && response.Installments.Count > 0)
                {
                    var schedules = response.InstallmentSchedules.OrderBy(x => x.CalculatedDueDate).ToList();
                    var receipts = response.Installments.Where(x => x.ReceiptDate.HasValue && x.AmountTypeId != 1).OrderBy(x => x.ReceiptDate).ToList();

                    int receiptIndex = 0;
                    decimal extraBalanceAmount = 0m;
                    DateTime previousReceiptDate = DateTime.MinValue;

                    foreach (var schedule in schedules)
                    {
                        if (!schedule.CalculatedDueDate.HasValue)
                            continue;

                        if (receiptIndex >= receipts.Count)
                            break;

                        decimal receivedAmount;
                        DateTime receiptDate;

                        //var receipt = receipts[receiptIndex];

                        //if (!receipt.ReceiptDate.HasValue)
                        //    continue;

                        DateTime dueDate = schedule.CalculatedDueDate.Value.Date;
                        decimal? installmentAmount = schedule.TotalEstimatedAmount;

                        if (installmentAmount <= extraBalanceAmount)
                        {
                            receiptDate = previousReceiptDate;
                            receivedAmount = extraBalanceAmount;
                        }
                        else
                        {
                            if (receiptIndex >= receipts.Count)
                                break;

                            var receipt = receipts[receiptIndex];

                            if (!receipt.ReceiptDate.HasValue)
                                continue;

                            var nextreceivedAmount = receipt.DraftAmount ?? 0m;
                            receivedAmount = nextreceivedAmount + extraBalanceAmount;

                            if (receivedAmount <= 0)
                                continue;

                            receiptDate = receipt.ReceiptDate.Value.Date;

                            // Save this receipt date because it may
                            // be required for the next installment
                            previousReceiptDate = receiptDate;
                            receiptIndex++;
                        }


                        int delayDays = 0;
                        int penalInterestRate = 6;
                        int PenalityRateInPercent = 10;

                        if (receiptDate > dueDate)
                        {
                            delayDays = (receiptDate - dueDate).Days;
                        }

                        // Your calculation here
                        decimal penalInterest = Convert.ToDecimal((installmentAmount * delayDays * penalInterestRate) / 36500);
                        decimal penalityAmount = Convert.ToDecimal((installmentAmount * PenalityRateInPercent) / 100);
                        decimal totalPenalityAmount = penalInterest + penalityAmount;
                        decimal extraAmount = Convert.ToDecimal(receivedAmount - installmentAmount);
                        extraBalanceAmount = extraAmount;

                        response.InstallmentCalculations.Add(new InstallmentCalculationDto
                        {
                            InstallmentId = schedule.Id,

                            InstallmentNo = schedule.InstallmentNo,

                            DueDate = dueDate,

                            ReceiptDate = receiptDate,

                            InstallmentAmount = Convert.ToDecimal(installmentAmount),

                            ReceivedAmount = Convert.ToDecimal(receivedAmount),

                            DelayDays = delayDays,

                            PenalInterest = Math.Round(penalInterest, 2),

                            PenalityAmount = Math.Round(penalityAmount, 2),

                            TotalPenalityAmount = Math.Round(totalPenalityAmount, 2),

                            ExtraAmount = Math.Round(extraAmount, 2)
                        });


                    }
                }
                return ApiResponse<PropertyBidderRegistrationDto>.Ok(response, "Registration fetched successfully");

            }
            catch (Exception ex)
            {
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(ex.Message);

            }
        }
        public async Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetAllRegistrationsAsync()
        {
            try
            {
                var list = await _context.PropertyBidderRegistration
                    .AsNoTracking()
                    .Where(x => x.IsActive && !x.IsDeleted)
                    .Select(x => new PropertyBidderRegistrationDto
                    {
                        Id = x.Id,
                        MandiId = x.MandiId,
                        BranchId = x.BranchId,
                        PropertyCode = x.PropertyCode,
                        ApplicantId = x.ApplicantId,
                        DistrictId = x.DistrictId,
                        PlotTypeId = x.PlotTypeId,
                        PlanId = x.PlanId,
                        PlotSize = x.PlotSize,
                        PlotNo = x.PlotNo,
                        AssetResumed = x.AssetResumed,
                        AssetSurrendered = x.AssetSurrendered,
                        IsAssetLocked = x.IsAssetLocked,
                        IsCourtCase = x.IsCourtCase,
                        IsDefaulter = x.IsDefaulter,
                        AnyComplaint = x.AnyComplaint,
                        NdcGenerated = x.NdcGenerated,
                        NdcIssued = x.NdcIssued,
                        AssetVerified = x.AssetVerified,
                        IsAuctioned = x.IsAuctioned,
                        AuctionDate = x.AuctionDate,
                        BidderTypeId = x.BidderTypeId,
                        BidderName = x.BidderName,
                        Email = x.Email,
                        IsTransferred = x.IsTransferred,
                        Relation = x.Relation,
                        FatherOrHusbandName = x.FatherOrHusbandName,
                        PANNo = x.PANNo,
                        AadhaarNo = x.AadhaarNo,
                        MobileNo = x.MobileNo,
                        PropertyTypeId = x.PropertyTypeId,
                        Address = x.Address,
                        ReservePrice = x.ReservePrice,
                        FinalBidPrice = x.FinalBidPrice,
                        FormTransactionId = x.FormTransactionId,
                        FormTxnDate = x.FormTxnDate,
                        FormPaidAmount = x.FormPaidAmount,
                        EmdTxnId = x.EmdTxnId,
                        EmdDate = x.EmdDate,
                        EmdAmount = x.EmdAmount,
                        AllotmentTxnId = x.AllotmentTxnId,
                        AllotmentDate = x.AllotmentDate,
                        AllotmentTransactionDate = x.AllotmentTransactionDate,
                        AllotmentAmount = x.AllotmentAmount,
                        DueAmount = x.DueAmount,
                        TotalDueWithInterest = x.TotalDueWithInterest,
                        ApplicationStatusId = x.ApplicationStatusId,
                        PlotStatus = x.PlotStatus,
                        PropertyCategoryId = x.PropertyCategoryId,
                        OwnerStateID = x.OwnerStateID,
                        OwnerDistrtictID = x.OwnerDistrtictID,
                        OwnerCityID = x.OwnerCityID
                    })
                    .ToListAsync();

                var propertyIds = list.Select(x => (int?)x.Id).ToList();

                var allInstallments = await _context.InstallmentDetails
                    .AsNoTracking()
                    .Where(i => propertyIds.Contains(i.PropertyId))
                    .Select(i => new InstallmentDetailsDto
                    {
                        Id = i.Id,
                        ReceiptNo = i.ReceiptNo,
                        ReceiptDate = i.ReceiptDate,
                        DraftNo = i.DraftNo,
                        DraftAmount = i.DraftAmount,
                        DraftDate = i.DraftDate,
                        DraftBank = i.DraftBank,
                        PrincipalAmount = i.Principal,
                        InterestAmount = i.Interest,
                        OtherAmount = i.OtherAmount,
                        PenaltyAmount = i.PenaltyAmount,
                        PenaltyType = i.Type,
                        Remarks = i.Remarks,
                        ApplicantId = i.ApplicantId,
                        PropertyId = i.PropertyId,
                        IsVerified = i.IsVerified
                    })
                    .ToListAsync();

                foreach (var reg in list)
                {
                    var installments = allInstallments.Where(i => i.PropertyId == reg.Id).ToList();
                    reg.Installments = installments;
                }

                return ApiResponse<List<PropertyBidderRegistrationDto>>.Ok(list, "Registrations fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PropertyBidderRegistrationDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> UpdateRegisterPropertyAsync(PropertyBidderRegistrationDto dto)
        {
            try
            {
                var entity = await _context.PropertyBidderRegistration.FirstOrDefaultAsync(x => x.Id == dto.Id);

                if (entity == null)
                    return ApiResponse<PropertyBidderRegistrationDto>.Fail("Record not found");

                dto.Id = entity.Id;


                entity.MandiId = dto.MandiId;
                entity.BranchId = dto.BranchId;
                entity.DistrictId = dto.DistrictId;
                entity.PlotTypeId = dto.PlotTypeId;
                entity.ApplicantId = dto.ApplicantId ?? 0;
                entity.PlanId = dto.PlanId;
                entity.PlotSize = dto.PlotSize;
                entity.PlotNo = dto.PlotNo;
                entity.AssetResumed = dto.AssetResumed ?? false;
                entity.AssetSurrendered = dto.AssetSurrendered ?? false;
                entity.IsAssetLocked = dto.IsAssetLocked ?? false;
                entity.IsDefaulter = dto.IsDefaulter ?? false;
                entity.AnyComplaint = dto.AnyComplaint ?? false;
                entity.NdcGenerated = dto.NdcGenerated ?? false;
                entity.NdcIssued = dto.NdcIssued ?? false;
                entity.AssetVerified = dto.AssetVerified ?? false;
                entity.IsAuctioned = dto.IsAuctioned ?? false;
                entity.AuctionDate = dto.AuctionDate;
                entity.IsCourtCase = dto.IsCourtCase ?? false;
                entity.BidderTypeId = dto.BidderTypeId;
                entity.BidderName = dto.BidderName;
                entity.Email = dto.Email;
                entity.IsTransferred = dto.IsTransferred ?? false;
                entity.Relation = dto.Relation;
                entity.FatherOrHusbandName = dto.FatherOrHusbandName;
                entity.PANNo = dto.PANNo;
                entity.AadhaarNo = dto.AadhaarNo;
                entity.MobileNo = dto.MobileNo;
                entity.PropertyTypeId = dto.PropertyTypeId;
                entity.Address = dto.Address;
                entity.ReservePrice = dto.ReservePrice;
                entity.FinalBidPrice = dto.FinalBidPrice;
                entity.FormTransactionId = dto.FormTransactionId;
                entity.FormTxnDate = dto.FormTxnDate;
                entity.FormPaidAmount = dto.FormPaidAmount;
                entity.EmdTxnId = dto.EmdTxnId;
                entity.EmdDate = dto.EmdDate;
                entity.EmdAmount = dto.EmdAmount;
                entity.AllotmentTxnId = dto.AllotmentTxnId;
                entity.AllotmentDate = dto.AllotmentDate;
                entity.AllotmentAmount = dto.AllotmentAmount;
                entity.DueAmount = dto.DueAmount;
                entity.TotalDueWithInterest = dto.TotalDueWithInterest;
                entity.ApplicationStatusId = 1;
                entity.PlotStatus = dto.PlotStatus;
                entity.PropertyCategoryId = dto.PropertyCategoryId ?? 0;
                entity.OwnerStateID = dto.OwnerStateID;
                entity.OwnerDistrtictID = dto.OwnerDistrtictID;
                entity.OwnerCityID = dto.OwnerCityID;
                entity.ModifiedDate = DateTime.UtcNow;
                entity.ModifiedBy = dto.ModifiedBy;
                entity.AllotmentTransactionDate = dto.AllotmentTransactionDate;

                await _context.SaveChangesAsync();

                var oldInstallments = _context.InstallmentDetails.Where(x => x.PropertyId == entity.Id);

                _context.InstallmentDetails.RemoveRange(oldInstallments);

                if (dto.Installments != null && dto.Installments.Any())
                {
                    var newInstallments = dto.Installments.Select(i => new Models.Entities.InstallmentDetails
                    {
                        ReceiptNo = i.ReceiptNo,
                        ReceiptDate = i.ReceiptDate,
                        DraftNo = i.DraftNo,
                        DraftAmount = i.DraftAmount ?? 0,
                        DraftDate = i.DraftDate,
                        DraftBank = i.DraftBank,
                        Principal = i.PrincipalAmount ?? 0,
                        Interest = i.InterestAmount ?? 0,
                        OtherAmount = i.OtherAmount ?? 0,
                        PenaltyAmount = i.PenaltyAmount ?? 0,
                        Type = i.PenaltyType,
                        Remarks = i.Remarks,
                        ApplicantId = entity.ApplicantId,
                        PropertyId = entity.Id,
                        IsVerified = i.IsVerified ?? false
                    }).ToList();

                    _context.InstallmentDetails.AddRange(newInstallments);
                }

                var oldSchedules = _context.InstallmentSchedule.Where(x => x.PropertyId == entity.Id);
                _context.InstallmentSchedule.RemoveRange(oldSchedules);

                if (dto.InstallmentSchedules != null && dto.InstallmentSchedules.Any())
                {
                    var newSchedules = dto.InstallmentSchedules.Select(s => new Models.Entities.InstallmentSchedule
                    {
                        PropertyId = entity.Id,
                        PropertyCode = entity.PropertyCode,
                        InstallmentNo = s.InstallmentNo,
                        CalculatedDueDate = s.CalculatedDueDate,
                        BasePrincipal = s.BasePrincipal ?? 0,
                        Interest = s.Interest ?? 0,
                        TotalEstimatedAmount = s.TotalEstimatedAmount ?? 0,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedDate = DateTime.UtcNow,
                        CreatedBy = (int?)(dto.CreatedBy ?? dto.ApplicantId ?? 0),
                        ModifiedDate = DateTime.UtcNow,
                        ModifiedBy = (int?)(dto.ModifiedBy ?? 0)
                    }).ToList();

                    _context.InstallmentSchedule.AddRange(newSchedules);
                }

                await _context.SaveChangesAsync();

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(dto, "Property updated successfully");
            }
            catch (Exception ex)
            {
              
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(ex.Message);
            }
        }
        public async Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetPendingForClerk(string? userid,string? searchCode,int districtId,int branchId,int mandiid)
        {
            try 
            { 
                using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                using var command = connection.CreateCommand();

                command.CommandText = "SP_GetDateForPropertyVerification";
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

                using var reader = await command.ExecuteReaderAsync();

                var list = new List<PropertyBidderRegistrationDto>();

                while (await reader.ReadAsync())
                {
                    var item = new PropertyBidderRegistrationDto
                    {
                        Id = Convert.ToInt32(reader["Id"]),

                        MandiId = Convert.ToInt32(reader["MandiId"]),

                        BranchId = Convert.ToInt32(reader["BranchId"]),

                        ApplicantId = GetInt(reader, "ApplicantId"),

                        DistrictId = Convert.ToInt32(reader["DistrictId"]),

                        PlotTypeId = GetInt(reader, "PlotTypeId"),

                        PlanId = GetInt(reader, "PlanId"),

                        PlotSize = GetString(reader, "PlotSize"),

                        // IMPORTANT:
                        // DB = int, DTO = int?
                        PlotNo = GetInt(reader, "PlotNo"),

                        // Flags
                        AssetResumed = GetBool(reader, "AssetResumed"),

                        AssetSurrendered = GetBool(reader, "AssetSurrendered"),

                        IsAssetLocked = GetBool(reader, "IsAssetLocked"),

                        IsDefaulter = GetBool(reader, "IsDefaulter"),

                        AnyComplaint = GetBool(reader, "AnyComplaint"),

                        NdcGenerated = GetBool(reader, "NdcGenerated"),

                        NdcIssued = GetBool(reader, "NdcIssued"),

                        AssetVerified = GetBool(reader, "AssetVerified"),

                        IsCourtCase = GetBool(reader, "IsCourtCase"),

                        // Auction
                        IsAuctioned = GetBool(reader, "IsAuctioned"),

                        AuctionDate = GetDateTime(reader, "AuctionDate"),

                        BidderTypeId = GetInt(reader, "BidderTypeId"),

                        BidderName = GetString(reader, "BidderName"),

                        Email = GetString(reader, "Email"),

                        IsTransferred = GetBool(reader, "IsTransferred"),

                        // Personal
                        Relation = GetString(reader, "Relation"),

                        FatherOrHusbandName =
                            GetString(reader, "FatherOrHusbandName"),

                        PANNo = GetString(reader, "PANNo"),

                        AadhaarNo = GetString(reader, "AadhaarNo"),

                        MobileNo = GetString(reader, "MobileNo"),

                        PropertyTypeId = GetInt(reader, "PropertyTypeId"),

                        Address = GetString(reader, "Address"),

                        // Financial
                        ReservePrice = GetDecimal(reader, "ReservePrice"),

                        FinalBidPrice = GetDecimal(reader, "FinalBidPrice"),
                        AllotmentDate = GetDateTime(reader, "AllotmentDate"),

                        // Form
                        FormTransactionId =
                            GetString(reader, "FormTransactionId"),

                        FormTxnDate =
                            GetDateTime(reader, "FormTxnDate"),

                        FormPaidAmount =
                            GetDecimal(reader, "FormPaidAmount"),

                        // EMD
                        EmdTxnId =
                            GetString(reader, "EmdTxnId"),

                        EmdDate =
                            GetDateTime(reader, "EmdDate"),

                        EmdAmount =
                            GetDecimal(reader, "EmdAmount"),

                        // Allotment
                        AllotmentTxnId =
                            GetString(reader, "AllotmentTxnId"),

                        
                        AllotmentTransactionDate = GetDateTime(reader, "AllotmentTransactionDate"),

                        AllotmentAmount =
                            GetDecimal(reader, "AllotmentAmount"),

                        // Outstanding
                        DueAmount =
                            GetDecimal(reader, "DueAmount"),

                        TotalDueWithInterest =
                            GetDecimal(reader, "TotalDueWithInterest"),

                        ApplicationStatusId =
                            GetInt(reader, "ApplicationStatusId"),

                        PlotStatus =
                            GetString(reader, "PlotStatus") ?? string.Empty,

                        PropertyCategoryId =
                            GetInt(reader, "PropertyCategoryId"),

                        PropertyCode =
                            GetString(reader, "PropertyCode"),

                        // CreatedBy is BIGINT
                        CreatedBy =
                            GetLong(reader, "CreatedBy"),

                        Remarks =
                            GetString(reader, "Remarks"),

                        // Owner
                        OwnerStateID =
                            GetInt(reader, "OwnerStateID"),

                        OwnerDistrtictID =
                            GetInt(reader, "OwnerDistrtictID"),

                        OwnerCityID =
                            GetInt(reader, "OwnerCityID"),

                        // Master names
                        DistrictName =
                            GetString(reader, "DistrictName") ?? string.Empty,

                        BranchName =
                            GetString(reader, "BranchName") ?? string.Empty,

                        MandiName =
                            GetString(reader, "MandiName") ?? string.Empty,

                        // User / Role
                        IdentityUserId =
                            GetString(reader, "IdentityUserId"),

                        FirstName =
                            GetString(reader, "FirstName"),

                        UserId =
                            GetString(reader, "UserId"),

                        RoleName =
                            GetString(reader, "RoleName"),

                        Label =
                            GetString(reader, "Label"),
                        ModifyByName = GetString(reader, "ModifiedUserName"),

                        // Initialize
                        Installments = new List<InstallmentDetailsDto>()
                    };

                    list.Add(item);
                }


                var installments = new List<InstallmentDetailsDto>();

                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var installment = new InstallmentDetailsDto
                        {
                            Id = Convert.ToInt32(reader["Id"]),

                            ReceiptNo =
                                GetString(reader, "ReceiptNo"),

                            ReceiptDate =
                                GetDateTime(reader, "ReceiptDate"),

                            DraftNo =
                                GetString(reader, "DraftNo"),

                            DraftAmount =
                                GetDecimal(reader, "DraftAmount"),

                            DraftDate =
                                GetDateTime(reader, "DraftDate"),

                            DraftBank =
                                GetString(reader, "DraftBank"),

                            PrincipalAmount =
                                GetDecimal(reader, "PrincipalAmount"),

                            InterestAmount =
                                GetDecimal(reader, "InterestAmount"),

                            OtherAmount =
                                GetDecimal(reader, "OtherAmount"),

                            PenaltyAmount =
                                GetDecimal(reader, "PenaltyAmount"),

                            PenaltyType =
                                GetString(reader, "PenaltyType"),

                            Remarks =
                                GetString(reader, "Remarks"),

                            ApplicantId =
                                GetInt(reader, "ApplicantId"),

                            PropertyId =
                                GetInt(reader, "PropertyId"),

                            IsVerified =
                                GetBool(reader, "IsVerified")
                        };

                        installments.Add(installment);
                    }
                }


                foreach (var property in list)
                {
                    property.Installments = installments
                        .Where(i => i.PropertyId == property.Id)
                        .ToList();
                }


                return ApiResponse<List<PropertyBidderRegistrationDto>>
                    .Ok(
                        list,
                        "Registrations fetched successfully"
                    );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PropertyBidderRegistrationDto>>
                    .Fail(ex.Message);
            }
        }
        private static int? GetInt(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return Convert.ToInt32(value);
        }

        private static long? GetLong(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return Convert.ToInt64(value);
        }

        private static decimal? GetDecimal(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return Convert.ToDecimal(value);
        }

        private static DateTime? GetDateTime(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return Convert.ToDateTime(value);
        }

        private static bool? GetBool(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return Convert.ToBoolean(value);
        }

        private static string? GetString(IDataRecord reader, string column)
        {
            var value = reader[column];

            if (value == DBNull.Value || value == null)
                return null;

            return value.ToString();
        }
        //public async Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetPendingForClerk(
        //    string? userid,
        //    string? searchCode,
        //    int districtId,
        //    int branchId,
        //    int mandiid)
        //{
        //    try
        //    {
        //        using var connection = _context.Database.GetDbConnection();
        //        await connection.OpenAsync();

        //        using var command = connection.CreateCommand();

        //        command.CommandText = "SP_GetDateForPropertyVerification";
        //        command.CommandType = CommandType.StoredProcedure;

        //        command.Parameters.Add(
        //            new SqlParameter("@UserId", (object?)userid ?? DBNull.Value));

        //        command.Parameters.Add(
        //            new SqlParameter("@SearchCode", (object?)searchCode ?? DBNull.Value));

        //        command.Parameters.Add(
        //            new SqlParameter("@DistrictId", districtId));

        //        command.Parameters.Add(
        //            new SqlParameter("@BranchId", branchId));

        //        command.Parameters.Add(
        //            new SqlParameter("@MandiId", mandiid));

        //        using var reader = await command.ExecuteReaderAsync();

        //        var list = new List<PropertyBidderRegistrationDto>();

        //        while (await reader.ReadAsync())
        //        {
        //            list.Add(new PropertyBidderRegistrationDto
        //            {
        //                Id = Convert.ToInt32(reader["Id"]),
        //                MandiId = Convert.ToInt32(reader["MandiId"]),
        //                BranchId = Convert.ToInt32(reader["BranchId"]),
        //                ApplicantId = Convert.ToInt32(reader["ApplicantId"]),
        //                DistrictId = Convert.ToInt32(reader["DistrictId"]),

        //                PlotTypeId = reader["PlotTypeId"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToInt32(reader["PlotTypeId"]),

        //                PlanId = reader["PlanId"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToInt32(reader["PlanId"]),

        //                PlotSize = reader["PlotSize"].ToString(),

        //                PlotNo = reader["PlotNo"] == DBNull.Value ? 0 : Convert.ToInt32("PlotNo"),

        //                AssetResumed = reader["AssetResumed"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["AssetResumed"]),

        //                AssetSurrendered = reader["AssetSurrendered"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["AssetSurrendered"]),

        //                IsAssetLocked = reader["IsAssetLocked"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["IsAssetLocked"]),

        //                IsDefaulter = reader["IsDefaulter"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["IsDefaulter"]),

        //                AnyComplaint = reader["AnyComplaint"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["AnyComplaint"]),

        //                NdcGenerated = reader["NdcGenerated"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["NdcGenerated"]),

        //                NdcIssued = reader["NdcIssued"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["NdcIssued"]),

        //                AssetVerified = reader["AssetVerified"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["AssetVerified"]),

        //                IsCourtCase = reader["IsCourtCase"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["IsCourtCase"]),

        //                IsAuctioned = reader["IsAuctioned"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["IsAuctioned"]),

        //                AuctionDate = reader["AuctionDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["AuctionDate"]),

        //                BidderTypeId = reader["BidderTypeId"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToInt32(reader["BidderTypeId"]),

        //                BidderName = reader["BidderName"]?.ToString(),
        //                Email = reader["Email"]?.ToString(),

        //                IsTransferred = reader["IsTransferred"] == DBNull.Value
        //                    ? false
        //                    : Convert.ToBoolean(reader["IsTransferred"]),

        //                Relation = reader["Relation"]?.ToString(),
        //                FatherOrHusbandName = reader["FatherOrHusbandName"]?.ToString(),
        //                PANNo = reader["PANNo"]?.ToString(),
        //                AadhaarNo = reader["AadhaarNo"]?.ToString(),
        //                MobileNo = reader["MobileNo"]?.ToString(),

        //                PropertyTypeId = reader["PropertyTypeId"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToInt32(reader["PropertyTypeId"]),

        //                Address = reader["Address"]?.ToString(),

        //                ReservePrice = reader["ReservePrice"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["ReservePrice"]),

        //                FinalBidPrice = reader["FinalBidPrice"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["FinalBidPrice"]),

        //                FormTransactionId = reader["FormTransactionId"]?.ToString(),

        //                FormTxnDate = reader["FormTxnDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["FormTxnDate"]),

        //                FormPaidAmount = reader["FormPaidAmount"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["FormPaidAmount"]),

        //                EmdTxnId = reader["EmdTxnId"]?.ToString(),

        //                EmdDate = reader["EmdDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["EmdDate"]),

        //                EmdAmount = reader["EmdAmount"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["EmdAmount"]),

        //                AllotmentTxnId = reader["AllotmentTxnId"]?.ToString(),

        //                AllotmentDate = reader["AllotmentDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["AllotmentDate"]),

        //                AllotmentAmount = reader["AllotmentAmount"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["AllotmentAmount"]),

        //                DueAmount = reader["DueAmount"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["DueAmount"]),

        //                TotalDueWithInterest =
        //                    reader["TotalDueWithInterest"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToDecimal(reader["TotalDueWithInterest"]),

        //                ApplicationStatusId =
        //                    reader["ApplicationStatusId"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["ApplicationStatusId"]),

        //                PlotStatus = reader["PlotStatus"]?.ToString(),

        //                PropertyCategoryId =
        //                    reader["PropertyCategoryId"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["PropertyCategoryId"]),

        //                PropertyCode = reader["PropertyCode"]?.ToString(),

        //                CreatedBy = reader["CreatedBy"]== DBNull.Value ?0 : Convert.ToInt32("CreatedBy"),

        //                Remarks = reader["Remarks"]?.ToString(),

        //                OwnerStateID =
        //                    reader["OwnerStateID"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["OwnerStateID"]),

        //                OwnerDistrtictID =
        //                    reader["OwnerDistrtictID"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["OwnerDistrtictID"]),

        //                OwnerCityID =
        //                    reader["OwnerCityID"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["OwnerCityID"]),

        //                // Master
        //                DistrictName =
        //                    reader["DistrictName"]?.ToString() ?? "",

        //                BranchName =
        //                    reader["BranchName"]?.ToString() ?? "",

        //                MandiName =
        //                    reader["MandiName"]?.ToString() ?? "",

        //                // User / Role
        //                IdentityUserId =
        //                    reader["IdentityUserId"]?.ToString(),

        //                FirstName =
        //                    reader["FirstName"]?.ToString(),

        //                UserId =
        //                    reader["UserId"]?.ToString(),

        //                RoleName =
        //                    reader["RoleName"]?.ToString(),

        //                Label =
        //                    reader["Label"]?.ToString(),

        //                // Initially empty
        //                Installments = new List<InstallmentDetailsDto>()
        //            });
        //        }

        //        await reader.NextResultAsync();

        //        var installments = new List<InstallmentDetailsDto>();

        //        while (await reader.ReadAsync())
        //        {
        //            installments.Add(new InstallmentDetailsDto
        //            {
        //                Id = Convert.ToInt32(reader["Id"]),

        //                ReceiptNo = reader["ReceiptNo"]?.ToString(),

        //                ReceiptDate = reader["ReceiptDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["ReceiptDate"]),

        //                DraftNo = reader["DraftNo"]?.ToString(),

        //                DraftAmount = reader["DraftAmount"] == DBNull.Value
        //                    ? 0
        //                    : Convert.ToDecimal(reader["DraftAmount"]),

        //                DraftDate = reader["DraftDate"] == DBNull.Value
        //                    ? null
        //                    : Convert.ToDateTime(reader["DraftDate"]),

        //                DraftBank = reader["DraftBank"]?.ToString(),

        //                PrincipalAmount =
        //                    reader["PrincipalAmount"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToDecimal(reader["PrincipalAmount"]),

        //                InterestAmount =
        //                    reader["InterestAmount"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToDecimal(reader["InterestAmount"]),

        //                OtherAmount =
        //                    reader["OtherAmount"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToDecimal(reader["OtherAmount"]),

        //                PenaltyAmount =
        //                    reader["PenaltyAmount"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToDecimal(reader["PenaltyAmount"]),

        //                PenaltyType =
        //                    reader["PenaltyType"]?.ToString(),

        //                Remarks =
        //                    reader["Remarks"]?.ToString(),

        //                ApplicantId =
        //                    reader["ApplicantId"] == DBNull.Value
        //                        ? 0
        //                        : Convert.ToInt32(reader["ApplicantId"]),

        //                PropertyId =
        //                    reader["PropertyId"] == DBNull.Value
        //                        ? null
        //                        : Convert.ToInt32(reader["PropertyId"]),

        //                IsVerified =
        //                    reader["IsVerified"] == DBNull.Value
        //                        ? false
        //                        : Convert.ToBoolean(reader["IsVerified"])
        //            });
        //        }


        //        foreach (var property in list)
        //        {
        //            property.Installments = installments
        //                .Where(x => x.PropertyId == property.Id)
        //                .ToList();
        //        }

        //        return ApiResponse<List<PropertyBidderRegistrationDto>>
        //            .Ok(
        //                list,
        //                "Registrations fetched successfully"
        //            );
        //    }
        //    catch (Exception ex)
        //    {
        //        return ApiResponse<List<PropertyBidderRegistrationDto>>
        //            .Fail(ex.Message);
        //    }
        //}
        //public async Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetPendingForClerk(string? userid,string? searchCode, int districtId, int branchId, int mandiid)
        //{
        //    try
        //    {
        //        var list = await (
        //            from x in _context.PropertyBidderRegistration

        //            join u in _context.ApplicationUsers
        //                on x.CreatedBy equals u.ApplicantId into userJoin
        //            from u in userJoin.DefaultIfEmpty()

        //            join ur in _context.UserRoles
        //                on u.IdentityUserId equals ur.UserId into userRoleJoin
        //            from ur in userRoleJoin.DefaultIfEmpty()

        //            join r in _context.Roles
        //                on ur.RoleId equals r.Id into roleJoin
        //            from r in roleJoin.DefaultIfEmpty()

        //            where x.IsActive && !x.IsDeleted && (string.IsNullOrEmpty(searchCode) || x.PropertyCode.Contains(searchCode))

        //            select new PropertyBidderRegistrationDto
        //            {
        //                Id = x.Id,
        //                MandiId = x.MandiId,
        //                BranchId = x.BranchId,
        //                ApplicantId = x.ApplicantId,
        //                DistrictId = x.DistrictId,
        //                PlotTypeId = x.PlotTypeId,
        //                PlanId = x.PlanId,
        //                PlotSize = x.PlotSize,
        //                PlotNo = x.PlotNo,
        //                AssetResumed = x.AssetResumed,
        //                AssetSurrendered = x.AssetSurrendered,
        //                IsAssetLocked = x.IsAssetLocked,
        //                IsDefaulter = x.IsDefaulter,
        //                AnyComplaint = x.AnyComplaint,
        //                NdcGenerated = x.NdcGenerated,
        //                NdcIssued = x.NdcIssued,
        //                AssetVerified = x.AssetVerified,
        //                IsCourtCase = x.IsCourtCase,
        //                IsAuctioned = x.IsAuctioned,
        //                AuctionDate = x.AuctionDate,
        //                BidderTypeId = x.BidderTypeId,
        //                BidderName = x.BidderName,
        //                Email = x.Email,
        //                IsTransferred = x.IsTransferred,
        //                Relation = x.Relation,
        //                FatherOrHusbandName = x.FatherOrHusbandName,
        //                PANNo = x.PANNo,
        //                AadhaarNo = x.AadhaarNo,
        //                MobileNo = x.MobileNo,
        //                PropertyTypeId = x.PropertyTypeId,
        //                Address = x.Address,
        //                ReservePrice = x.ReservePrice,
        //                FinalBidPrice = x.FinalBidPrice,
        //                FormTransactionId = x.FormTransactionId,
        //                FormTxnDate = x.FormTxnDate,
        //                FormPaidAmount = x.FormPaidAmount,
        //                EmdTxnId = x.EmdTxnId,
        //                EmdDate = x.EmdDate,
        //                EmdAmount = x.EmdAmount,
        //                AllotmentTxnId = x.AllotmentTxnId,
        //                AllotmentDate = x.AllotmentDate,
        //                AllotmentAmount = x.AllotmentAmount,
        //                DueAmount = x.DueAmount,
        //                TotalDueWithInterest = x.TotalDueWithInterest,
        //                ApplicationStatusId = x.ApplicationStatusId,
        //                PlotStatus = x.PlotStatus,
        //                PropertyCategoryId = x.PropertyCategoryId,
        //                PropertyCode = x.PropertyCode,
        //                CreatedBy = x.CreatedBy,
        //                Remarks=x.Remarks,
        //                DistrictName = x.District != null ? x.District.DistrictName : "",
        //                BranchName = x.Branch != null ? x.Branch.BranchName : "",
        //                MandiName = x.Mandi != null ? x.Mandi.MandiName : "",

        //                IdentityUserId = u != null ? u.IdentityUserId : null,
        //                UserId = ur != null ? ur.UserId : null,
        //                RoleName = r != null ? r.Name : null,
        //                FirstName= u.FirstName,

        //                Label = r != null && r.Name.ToUpper() == "DEO" ? "DEO" : "User",
        //                OwnerStateID = x.OwnerStateID,
        //                OwnerDistrtictID = x.OwnerDistrtictID,
        //                OwnerCityID = x.OwnerCityID
        //            }
        //        ).OrderByDescending(x=>x.Id).ToListAsync();

        //        var propertyIds = list.Select(x => (int?)x.Id).ToList();

        //        var allInstallments = await _context.InstallmentDetails
        //            .AsNoTracking()
        //            .Where(i => propertyIds.Contains(i.PropertyId))
        //            .Select(i => new InstallmentDetailsDto
        //            {
        //                Id = i.Id,
        //                ReceiptNo = i.ReceiptNo,
        //                ReceiptDate = i.ReceiptDate,
        //                DraftNo = i.DraftNo,
        //                DraftAmount = i.DraftAmount,
        //                DraftDate = i.DraftDate,
        //                DraftBank = i.DraftBank,
        //                PrincipalAmount = i.Principal,
        //                InterestAmount = i.Interest,
        //                OtherAmount = i.OtherAmount,
        //                PenaltyAmount = i.PenaltyAmount,
        //                PenaltyType = i.Type,
        //                Remarks = i.Remarks,
        //                ApplicantId = i.ApplicantId,
        //                PropertyId = i.PropertyId,
        //                IsVerified = i.IsVerified
        //            })
        //            .ToListAsync();

        //        return ApiResponse<List<PropertyBidderRegistrationDto>>
        //            .Ok(list, "Registrations fetched successfully");
        //    }
        //    catch (Exception ex)
        //    {
        //        return ApiResponse<List<PropertyBidderRegistrationDto>>
        //            .Fail(ex.Message);
        //    }
        //}
        public async Task<ApiResponse<bool>> VerifyByClerk(ClerkVerificationDto dto)
        {
            try
            {
                var record = await _context.PropertyBidderRegistration
                    .FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted);

                if (record == null)
                    return ApiResponse<bool>.Fail("Record not found");

                if (dto.Decision == "sendback" && string.IsNullOrWhiteSpace(dto.Remarks))
                    return ApiResponse<bool>.Fail("Remarks required for send back");

                string role = string.IsNullOrWhiteSpace(dto.Role) ? "Clerk" : dto.Role;

                if (role.Equals("Clerk", StringComparison.OrdinalIgnoreCase))
                {
                    if (record.ApplicationStatusId == 2)
                        return ApiResponse<bool>.Fail("Already verified by clerk");

                    if (dto.Decision == "approve")
                    {
                        record.ApplicationStatusId = 2;
                    }
                    else if (dto.Decision == "sendback")
                    {
                        record.ApplicationStatusId = 7;
                        record.Remarks = dto.Remarks;
                    }
                    else
                    {
                        return ApiResponse<bool>.Fail("Invalid decision");
                    }
                }
                else if (role.Equals("Senior Assistant", StringComparison.OrdinalIgnoreCase))
                {
                    if (record.ApplicationStatusId == 3)
                        return ApiResponse<bool>.Fail("Already verified by assistant");

                    if (dto.Decision == "approve")
                    {
                        record.ApplicationStatusId = 3;
                    }
                    else if (dto.Decision == "sendback")
                    {
                        record.ApplicationStatusId = 7;
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

        public async Task<ApiResponse<List<DistrictDto>>> GetPropertyDistrictsAsync()
        {
            try
            {
                var districts = new List<DistrictDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetPropertyDistricts";
                command.CommandType = CommandType.StoredProcedure;

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    districts.Add(new DistrictDto
                    {
                        DistrictId = reader["DistrictId"] != DBNull.Value
                            ? Convert.ToInt32(reader["DistrictId"])
                            : 0,

                        DistrictName = reader["DistrictName"] != DBNull.Value
                            ? reader["DistrictName"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<DistrictDto>>.Ok(
                    districts,
                    "Districts fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<DistrictDto>>.Fail(
                    $"Error while fetching districts: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<BranchDto>>> GetPropertyBranchesAsync(int districtId)
        {
            try
            {
                var branches = new List<BranchDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetPropertyBranches";
                command.CommandType = CommandType.StoredProcedure;

                var districtParam = command.CreateParameter();
                districtParam.ParameterName = "@DistrictId";
                districtParam.Value = districtId;
                districtParam.DbType = DbType.Int32;

                command.Parameters.Add(districtParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    branches.Add(new BranchDto
                    {
                        BranchId = reader["BranchId"] != DBNull.Value
                            ? Convert.ToInt32(reader["BranchId"])
                            : 0,

                        BranchName = reader["BranchName"] != DBNull.Value
                            ? reader["BranchName"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<BranchDto>>.Ok(
                    branches,
                    "Branches fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<BranchDto>>.Fail(
                    $"Error while fetching branches: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<MandiDto>>> GetPropertyMandisAsync(int branchId)
        {
            try
            {
                var mandis = new List<MandiDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetPropertyMandis";
                command.CommandType = CommandType.StoredProcedure;

                var branchParam = command.CreateParameter();
                branchParam.ParameterName = "@BranchId";
                branchParam.Value = branchId;
                branchParam.DbType = DbType.Int32;

                command.Parameters.Add(branchParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    mandis.Add(new MandiDto
                    {
                        MandiId = reader["MandiId"] != DBNull.Value
                            ? Convert.ToInt32(reader["MandiId"])
                            : 0,

                        MandiName = reader["MandiName"] != DBNull.Value
                            ? reader["MandiName"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<MandiDto>>.Ok(
                    mandis,
                    "Mandis fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MandiDto>>.Fail(
                    $"Error while fetching mandis: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<PlotTypeDto>>> GetPropertyPlotTypesAsync(int mandiId)
        {
            try
            {
                var plotTypes = new List<PlotTypeDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetPropertyPlotTypes";
                command.CommandType = CommandType.StoredProcedure;

                var mandiParam = command.CreateParameter();
                mandiParam.ParameterName = "@MandiId";
                mandiParam.Value = mandiId;
                mandiParam.DbType = DbType.Int32;

                command.Parameters.Add(mandiParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    plotTypes.Add(new PlotTypeDto
                    {
                        PlotTypeId = reader["PlotTypeId"] != DBNull.Value
                            ? Convert.ToInt32(reader["PlotTypeId"])
                            : 0,

                        PlotType = reader["PlotType"] != DBNull.Value
                            ? reader["PlotType"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<PlotTypeDto>>.Ok(
                    plotTypes,
                    "Plot types fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotTypeDto>>.Fail(
                    $"Error while fetching plot types: {ex.Message}"
                );
            }
        }

        public async Task<List<AuctionedPlotDto>> GetAuctionedPlotsAsync(int mandiId, int plotTypeId)
        {
            var result = new List<AuctionedPlotDto>();

            await using var connection = _context.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await using var command = connection.CreateCommand();

            command.CommandText = "sp_GetAuctionedPlots";
            command.CommandType = CommandType.StoredProcedure;

            var mandiParameter = command.CreateParameter();
            mandiParameter.ParameterName = "@MandiId";
            mandiParameter.Value = mandiId;
            command.Parameters.Add(mandiParameter);

            var plotTypeParameter = command.CreateParameter();
            plotTypeParameter.ParameterName = "@PlotTypeId";
            plotTypeParameter.Value = plotTypeId;
            command.Parameters.Add(plotTypeParameter);

            await using var reader = await command.ExecuteReaderAsync();

            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < reader.FieldCount; i++)
            {
                columns.Add(reader.GetName(i));
            }

            while (await reader.ReadAsync())
            {
                var dto = new AuctionedPlotDto();
                if (columns.Contains("PlotNo") && reader["PlotNo"] != DBNull.Value)
                {
                    dto.PlotNo = Convert.ToInt32(reader["PlotNo"]);
                }
                result.Add(dto);
            }

            return result;
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> GetPropertyDetailsByMandiPlot(int MandiId, int PlotTypeId, string PlotNo, string PlotSize, bool isSold = false)
        {
            try
            {
                var connection = (SqlConnection)_context.Database.GetDbConnection();

                await connection.OpenAsync();

                using var command = new SqlCommand("SP_GetPropertyDetailsByMandiPlot", connection);
                command.CommandType = CommandType.StoredProcedure;
                // NEW PARAMETERS
                command.Parameters.AddWithValue("@MandiId", MandiId);
                command.Parameters.AddWithValue("@PlotTypeId", PlotTypeId);
                command.Parameters.AddWithValue("@PlotNo", PlotNo);
                command.Parameters.AddWithValue("@PlotSize", PlotSize);
                command.Parameters.AddWithValue("@IsPropertySold", isSold);


                using var adapter = new SqlDataAdapter(command);

                var dataSet = new DataSet();

                adapter.Fill(dataSet);
                // Create response for checking
                var response = new PropertyBidderRegistrationDto();

                if (dataSet.Tables.Count > 0 && dataSet.Tables[0].Rows.Count > 0)
                {
                    var table = dataSet.Tables[0];
                    var row = table.Rows[0];

                    response.Id = row["PropertyId"] != DBNull.Value
                        ? Convert.ToInt32(row["PropertyId"])
                        : 0;

                    response.PropertyCode = row["PropertyCode"]?.ToString();

                    response.MandiId = row["MandiId"] != DBNull.Value
                        ? Convert.ToInt32(row["MandiId"])
                        : 0;
                    
                    response.BranchId = row["BranchId"] != DBNull.Value
                        ? Convert.ToInt32(row["BranchId"])
                        : 0;

                    response.DistrictId = row["DistrictId"] != DBNull.Value
                        ? Convert.ToInt32(row["DistrictId"])
                        : 0;

                    response.PlotTypeId = row["PlotTypeId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotTypeId"])
                        : null;

                    response.PlanId = row["PlanId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlanId"])
                        : null;

                    response.PlanName = table.Columns.Contains("PlanName") && row["PlanName"] != DBNull.Value
                        ? row["PlanName"].ToString()
                        : null;

                    response.PlotSize = row["PlotSize"] != DBNull.Value
                        ? Convert.ToString(row["PlotSize"])
                        : null;

                    response.PlotNo = row["PlotNo"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotNo"])
                        : null;

                    response.PlotStatus = row["PropertyStatus"] != DBNull.Value
                      ? Convert.ToString(row["PropertyStatus"])
                      : null;
                    response.AssetVerified =
                            row["IsAssetVerified"] != DBNull.Value
                                ? Convert.ToBoolean(row["IsAssetVerified"])
                                : null;

                    response.NdcGenerated =
                        row["IsNDCGenerated"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCGenerated"])
                            : null;

                    response.NdcIssued =
                        row["IsNDCIssued"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCIssued"])
                            : null;

                    response.AnyComplaint =
                        row["IsAnyComplaint"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAnyComplaint"])
                            : null;

                    response.IsDefaulter =
                        row["IsDefaulter"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsDefaulter"])
                            : null;

                    response.AssetSurrendered =
                        row["IsAssetSurrendered"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetSurrendered"])
                            : null;

                    response.IsAssetLocked =
                        row["IsLocked"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsLocked"])
                            : null;

                    response.AssetResumed =
                        row["IsAssetResumed"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetResumed"])
                            : null;
                    response.IsAuctioned = row["IsAssetAuctioned"] != DBNull.Value ? Convert.ToBoolean(row["IsAssetAuctioned"]) : null;

                    response.PropertyCategoryId =
                      row["PropertyCategoryId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyCategoryId"])
                          : null;
                    response.PropertyTypeId =
                      row["PropertyTypeId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyTypeId"])
                          : null;


                    response.DistrictName =
                  row["DistrictName"] != DBNull.Value
                      ? Convert.ToString(row["DistrictName"])
                      : null;

                    //response.BranchName = row["BranchName"] != DBNull.Value
                    //                    ? Convert.ToString(row["BranchName"])
                    //                    : null;

                    response.MandiName =
                     row["MandiName"] != DBNull.Value
                         ? Convert.ToString(row["MandiName"])
                         : null;
                    //response.BidderTypeId =
                    //  row["BiddingType"] != DBNull.Value
                    //      ? Convert.ToInt32(row["BiddingType"])
                    //      : null;

                }


                // Allottee Details 
                if (dataSet.Tables.Count > 1 &&
                    dataSet.Tables[1].Rows.Count > 0)
                {
                    var row = dataSet.Tables[1].Rows[0];
                    response.BidderName = row["AllotteeName"] != DBNull.Value
                            ? row["AllotteeName"]?.ToString()
                           : null;

                    response.Email =
                        row["EmailId"] != DBNull.Value
                            ? row["EmailId"]?.ToString()
                            : null;



                    // =====================================
                    // Personal Details
                    // =====================================

                    //response.Relation =
                    //    row["Relation"] != DBNull.Value
                    //        ? row["Relation"]?.ToString()
                    //        : null;

                    response.FatherOrHusbandName =
                        row["AllotteeFatherName"] != DBNull.Value
                            ? row["AllotteeFatherName"]?.ToString()
                            : null;

                    response.PANNo =
                        row["PanNumber"] != DBNull.Value
                            ? row["PanNumber"]?.ToString()
                            : null;

                    //response.AadhaarNo =
                    //    row["DocumentNumber"] != DBNull.Value
                    //        ? row["DocumentNumber"]?.ToString()
                    //        : null;

                    response.MobileNo =
                        row["MobileNo"] != DBNull.Value
                            ? row["MobileNo"]?.ToString()
                            : null;

                    // Owner Details
                    response.OwnerStateID =
                        row["StateId"] != DBNull.Value
                            ? Convert.ToInt32(row["StateId"])
                            : null;

                    response.OwnerDistrtictID =
                        row["DistrictId"] != DBNull.Value
                            ? Convert.ToInt32(row["DistrictId"])
                            : null;

                    response.OwnerCityID =
                        row["CityId"] != DBNull.Value
                            ? Convert.ToInt32(row["CityId"])
                            : null;

                    response.Address =
                        row["AllotteeAddress"] != DBNull.Value
                            ? row["AllotteeAddress"]?.ToString()
                            : null;
                }
                // =====================================
                // TABLE 2 - PropertyAuctionDetail
                // =====================================

                if (dataSet.Tables.Count > 2 &&
                    dataSet.Tables[2].Rows.Count > 0)
                {
                    var row = dataSet.Tables[2].Rows[0];
                    response.AuctionDate =
                      row["AuctionDate"] != DBNull.Value
                          ? Convert.ToDateTime(row["AuctionDate"])
                          : null;
                    // Financial Details
                    response.ReservePrice =
                        row["ReservePrice"] != DBNull.Value
                            ? Convert.ToDecimal(row["ReservePrice"])
                            : null;

                    response.FinalBidPrice =
                        row["SalesAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["SalesAmount"])
                            : null;


                    // EMD
                    //response.EmdTxnId =
                    //    row["EmdTxnId"] != DBNull.Value
                    //        ? row["EmdTxnId"]?.ToString()
                    //        : null;

                    //response.EmdDate =
                    //    row["EmdDate"] != DBNull.Value
                    //        ? Convert.ToDateTime(row["EmdDate"])
                    //        : null;

                    //response.EmdAmount =
                    //    row["EmdAmount"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["EmdAmount"])
                    //        : null;


                    // 25% Allotment
                    //response.AllotmentTxnId =
                    //    row["AllotmentTxnId"] != DBNull.Value
                    //        ? row["AllotmentTxnId"]?.ToString()
                    //        : null;

                    response.AllotmentDate =
                        row["DateOfAllotment"] != DBNull.Value
                            ? Convert.ToDateTime(row["DateOfAllotment"])
                            : null;

                    //response.AllotmentAmount =
                    //    row["AllotmentAmount"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["AllotmentAmount"])
                    //        : null;


                    // Outstanding
                    response.DueAmount =
                        row["BalanceAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["BalanceAmount"])
                            : null;

                    //response.TotalDueWithInterest =
                    //    row["TotalDueWithInterest"] != DBNull.Value
                    //        ? Convert.ToDecimal(row["TotalDueWithInterest"])
                    //        : null;


                    // Remarks
                    //response.Remarks =
                    //    row["Remarks"] != DBNull.Value
                    //        ? row["Remarks"]?.ToString()
                    //        : null;
                }

                response.InstallmentSchedules = new List<InstallmentScheduleDto>();

                if (dataSet.Tables.Count > 3 &&
                    dataSet.Tables[3].Rows.Count > 0)
                {
                    var table = dataSet.Tables[3];

                    foreach (DataRow row in table.Rows)
                    {
                        var schedule = new InstallmentScheduleDto
                        {

                            Id = row["InstallmentId"] != DBNull.Value
                                ? Convert.ToInt32(row["InstallmentId"])
                                : 0,

                            PropertyId = row["PropertyId"] != DBNull.Value
                                ? Convert.ToInt32(row["PropertyId"])
                                : 0,

                            PropertyCode = row["AllotteeCode"] != DBNull.Value
                                ? row["AllotteeCode"]?.ToString()
                                : null,

                            InstallmentNo = row["InstallmentNo"] != DBNull.Value
                                ? Convert.ToString(row["InstallmentNo"])
                                : null,

                            CalculatedDueDate = row["DueDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DueDate"])
                                : null,

                            BasePrincipal = row["DueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DueAmount"])
                                : 0,

                            Interest = row["Interest"] != DBNull.Value
                                ? Convert.ToDecimal(row["Interest"])
                                : 0,

                            TotalEstimatedAmount = row["TotalDueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["TotalDueAmount"])
                                : 0
                        };

                        response.InstallmentSchedules.Add(schedule);
                    }
                }
                // =====================================
                // TABLE 5 - PropertyInstallmentDetails
                // =====================================

                response.Installments = new List<InstallmentDetailsDto>();

                if (dataSet.Tables.Count > 5 &&
                    dataSet.Tables[5].Rows.Count > 0)
                {
                    var table = dataSet.Tables[5];

                    foreach (DataRow row in table.Rows)
                    {
                        var installment = new InstallmentDetailsDto
                        {
                            Id = row["DraftId"] != DBNull.Value
                                ? Convert.ToInt32(row["DraftId"])
                                : 0,

                            ReceiptNo = row["ReceiptNo"] != DBNull.Value
                                ? row["ReceiptNo"]?.ToString()
                                : null,

                            ReceiptDate = row["ReceiptDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["ReceiptDate"])
                                : null,

                            DraftNo = row["DraftNo"] != DBNull.Value
                                ? row["DraftNo"]?.ToString()
                                : null,

                            DraftAmount = row["DraftAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DraftAmount"])
                                : null,

                            DraftDate = row["DraftDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DraftDate"])
                                : null,

                            DraftBank = row["ChallanBank"] != DBNull.Value
                                ? row["DraftBankId"]?.ToString()
                                : null,

                            PrincipalAmount = row["PrincipalAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PrincipalAmount"])
                                : null,

                            InterestAmount = row["InterestAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["InterestAmount"])
                                : null,

                            OtherAmount = row["OtherAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["OtherAmount"])
                                : null,

                            PenaltyAmount = row["PenalityAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PenalityAmount"])
                                : null,

                            PenaltyType = row["PenalityTypeId"] != DBNull.Value
                                ? row["PenalityTypeId"]?.ToString()
                                : null,
                            AmountTypeId = row["AmountTypeId"] != DBNull.Value
                                          ? Convert.ToInt32(row["AmountTypeId"]) : 0,

                            Remarks = row["Remarks"] != DBNull.Value
                                ? row["Remarks"]?.ToString()
                                : null,


                            //IsVerified = row["IsVerified"] != DBNull.Value
                            //    ? Convert.ToBoolean(row["IsVerified"])
                            //    : null
                        };

                        response.Installments.Add(installment);
                    }
                }

                if (dataSet.Tables.Count > 6 && dataSet.Tables[6].Rows.Count > 0)
                {
                    var row = dataSet.Tables[6].Rows[0];
                    // Form Fee
                    response.FormTransactionId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.FormTxnDate =
                        row["ReceiptDate"] != DBNull.Value
                            ? Convert.ToDateTime(row["ReceiptDate"])
                            : null;

                    response.FormPaidAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }
                if (dataSet.Tables.Count > 7 && dataSet.Tables[7].Rows.Count > 0)
                {
                    var row = dataSet.Tables[7].Rows[0];
                    // Form Fee
                    response.AllotmentTxnId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.AllotmentTransactionDate =
                       row["ReceiptDate"] != DBNull.Value
                           ? Convert.ToDateTime(row["ReceiptDate"])
                           : null;

                    response.AllotmentAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }

                response.InstallmentCalculations = new List<InstallmentCalculationDto>();

                if (response.InstallmentSchedules.Count > 0 && response.Installments.Count > 0)
                {
                    var schedules = response.InstallmentSchedules.OrderBy(x => x.CalculatedDueDate).ToList();
                    var receipts = response.Installments.Where(x => x.ReceiptDate.HasValue && x.AmountTypeId !=1).OrderBy(x => x.ReceiptDate).ToList();

                    int receiptIndex = 0;
                    decimal extraBalanceAmount = 0m;
                    DateTime previousReceiptDate = DateTime.MinValue;

                    foreach (var schedule in schedules)
                    {
                        if (!schedule.CalculatedDueDate.HasValue)
                            continue;

                        if (receiptIndex >= receipts.Count)
                            break;

                        decimal receivedAmount;
                        DateTime receiptDate;

                        //var receipt = receipts[receiptIndex];

                        //if (!receipt.ReceiptDate.HasValue)
                        //    continue;

                        DateTime dueDate = schedule.CalculatedDueDate.Value.Date;
                        decimal? installmentAmount = schedule.TotalEstimatedAmount;

                        if(installmentAmount <= extraBalanceAmount)
                        {
                            receiptDate = previousReceiptDate;
                            receivedAmount = extraBalanceAmount;
                        }
                        else
                        {
                            if (receiptIndex >= receipts.Count)
                                break;

                            var receipt = receipts[receiptIndex];

                            if (!receipt.ReceiptDate.HasValue)
                                continue;

                           var nextreceivedAmount = receipt.DraftAmount ?? 0m;
                            receivedAmount = nextreceivedAmount + extraBalanceAmount;

                            if (receivedAmount <= 0)
                                continue;

                            receiptDate = receipt.ReceiptDate.Value.Date;

                            // Save this receipt date because it may
                            // be required for the next installment
                            previousReceiptDate = receiptDate;
                            receiptIndex++;
                        }
                       

                        int delayDays = 0;
                        int penalInterestRate = 6;
                        int PenalityRateInPercent = 10;

                        if (receiptDate > dueDate)
                        {
                            delayDays = (receiptDate - dueDate).Days;
                        }

                        // Your calculation here
                        decimal penalInterest = Convert.ToDecimal((installmentAmount * delayDays * penalInterestRate) / 36500);
                        decimal penalityAmount = Convert.ToDecimal((installmentAmount * PenalityRateInPercent) / 100);
                        decimal totalPenalityAmount = penalInterest + penalityAmount;
                        decimal extraAmount = Convert.ToDecimal(receivedAmount - installmentAmount);
                         extraBalanceAmount = extraAmount;

                        response.InstallmentCalculations.Add(new InstallmentCalculationDto
                            {
                                InstallmentId = schedule.Id,
                           
                                InstallmentNo = schedule.InstallmentNo,
                           
                                DueDate = dueDate,
                           
                                ReceiptDate = receiptDate,
                           
                                InstallmentAmount = Convert.ToDecimal(installmentAmount),
                           
                                ReceivedAmount = Convert.ToDecimal(receivedAmount),
                           
                                DelayDays = delayDays,
                           
                                PenalInterest = Math.Round(penalInterest, 2),
                           
                                PenalityAmount = Math.Round(penalityAmount, 2),
                           
                                TotalPenalityAmount =Math.Round(totalPenalityAmount, 2),
                           
                                ExtraAmount = Math.Round(extraAmount, 2)
                            });


                    }
                }

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(response, "Registration fetched successfully");

            }
            catch (Exception ex)
            {
                return ApiResponse<PropertyBidderRegistrationDto>.Fail(ex.Message);

            }
        }
        public Task<ApiResponse<List<DistrictMasterDto>>> GetDistrictByHRMSUser(string v)
        {
            throw new NotImplementedException();
        }

        public async Task<ApiResponse<List<Models.Dtos.PropertyBidderRegistration>>> GetAllRegisterPropertyById(string v)
        {
            try
            {
                var result = await _context.Database
                    .SqlQuery<Models.Dtos.PropertyBidderRegistration>(
                        $"EXEC GetAllRegisterPropertyById @UserId={v}"
                    )
                    .ToListAsync();

                return ApiResponse<List<Models.Dtos.PropertyBidderRegistration>>.Ok(
                    result,
                    "Properties fetched successfully"
                );
            }
            catch (Exception ex)
            {    

                return ApiResponse<List<Models.Dtos.PropertyBidderRegistration>>.Fail(
                    "Failed to fetch registered properties"
                );
            }
        }

        public async Task<ApiResponse<PropertyBidderRegistrationDto>> GetBiderPropertyDetailsByMandiPlotAsync(int mandiId, int plotTypeId, string plotNo, string plotSize)
        {
            try
            {

                var connection = (SqlConnection)_context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                using var command = new SqlCommand(
                    "SP_GetBiderPropertyDetailsByMandiPlot",
                    connection);

                command.CommandType = CommandType.StoredProcedure;
                command.CommandTimeout = 120;

                // ==========================================
                // PARAMETERS
                // ==========================================

                command.Parameters.AddWithValue("@MandiId", mandiId);
                command.Parameters.AddWithValue("@PlotTypeId", plotTypeId);
                command.Parameters.AddWithValue("@PlotNo", plotNo);
                command.Parameters.AddWithValue("@PlotSize", plotSize);

                // ==========================================
                // EXECUTE STORED PROCEDURE USING DATASET
                // ==========================================

                var dataSet = new DataSet();

                using var adapter = new SqlDataAdapter(command);

                adapter.Fill(dataSet);

                // ==========================================
                // CHECK PROPERTY
                // ==========================================

                if (dataSet.Tables.Count == 0 ||
                    dataSet.Tables[0].Rows.Count == 0)
                {
                    return ApiResponse<PropertyBidderRegistrationDto>.Fail(
                        "No property found against the given Mandi, Plot Type and Plot No.");
                }

                var response = new PropertyBidderRegistrationDto();

                if (dataSet.Tables.Count > 0 && dataSet.Tables[0].Rows.Count > 0)
                {
                    var table = dataSet.Tables[0];
                    var row = table.Rows[0];

                    response.Id = row["PropertyId"] != DBNull.Value
                        ? Convert.ToInt32(row["PropertyId"])
                        : 0;

                    response.PropertyCode = row["PropertyCode"]?.ToString();

                    response.MandiId = row["MandiId"] != DBNull.Value
                        ? Convert.ToInt32(row["MandiId"])
                        : 0;

                    response.BranchId = row["BranchId"] != DBNull.Value
                        ? Convert.ToInt32(row["BranchId"])
                        : 0;

                    response.DistrictId = row["DistrictId"] != DBNull.Value
                        ? Convert.ToInt32(row["DistrictId"])
                        : 0;

                    response.PlotTypeId = row["PlotTypeId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotTypeId"])
                        : null;

                    response.PlanId = row["PlanId"] != DBNull.Value
                        ? Convert.ToInt32(row["PlanId"])
                        : null;

                    response.PlanName = table.Columns.Contains("PlanName") && row["PlanName"] != DBNull.Value
                        ? row["PlanName"].ToString()
                        : null;

                    response.PlotSize = row["PlotSize"] != DBNull.Value
                        ? Convert.ToString(row["PlotSize"])
                        : null;

                    response.PlotNo = row["PlotNo"] != DBNull.Value
                        ? Convert.ToInt32(row["PlotNo"])
                        : null;

                    response.PlotStatus = row["PropertyStatus"] != DBNull.Value
                      ? Convert.ToString(row["PropertyStatus"])
                      : null;
                    response.AssetVerified =
                            row["IsAssetVerified"] != DBNull.Value
                                ? Convert.ToBoolean(row["IsAssetVerified"])
                                : null;

                    response.NdcGenerated =
                        row["IsNDCGenerated"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCGenerated"])
                            : null;

                    response.NdcIssued =
                        row["IsNDCIssued"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsNDCIssued"])
                            : null;

                    response.AnyComplaint =
                        row["IsAnyComplaint"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAnyComplaint"])
                            : null;

                    response.IsDefaulter =
                        row["IsDefaulter"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsDefaulter"])
                            : null;

                    response.AssetSurrendered =
                        row["IsAssetSurrendered"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetSurrendered"])
                            : null;

                    response.IsAssetLocked =
                        row["IsLocked"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsLocked"])
                            : null;

                    response.AssetResumed =
                        row["IsAssetResumed"] != DBNull.Value
                            ? Convert.ToBoolean(row["IsAssetResumed"])
                            : null;
                    response.IsAuctioned = row["IsAssetAuctioned"] != DBNull.Value ? Convert.ToBoolean(row["IsAssetAuctioned"]) : null;

                    response.PropertyCategoryId =
                      row["PropertyCategoryId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyCategoryId"])
                          : null;
                    response.PropertyTypeId =
                      row["PropertyTypeId"] != DBNull.Value
                          ? Convert.ToInt32(row["PropertyTypeId"])
                          : null;

                   
                    response.DistrictName =
                     row["DistrictName"] != DBNull.Value
                         ? Convert.ToString(row["DistrictName"])
                         : null;

                    //response.BranchName = row["BranchName"] != DBNull.Value
                    //                    ? Convert.ToString(row["BranchName"])
                    //                    : null;

                    response.MandiName =
                     row["MandiName"] != DBNull.Value
                         ? Convert.ToString(row["MandiName"])
                         : null;
                    //response.BidderTypeId =
                    //  row["BiddingType"] != DBNull.Value
                    //      ? Convert.ToInt32(row["BiddingType"])
                    //      : null;

                }


                // Allottee Details 
                if (dataSet.Tables.Count > 1 &&
                    dataSet.Tables[1].Rows.Count > 0)
                {
                    var row = dataSet.Tables[1].Rows[0];
                    response.BidderName = row["AllotteeName"] != DBNull.Value
                            ? row["AllotteeName"]?.ToString()
                           : null;

                    response.Email =
                        row["EmailId"] != DBNull.Value
                            ? row["EmailId"]?.ToString()
                            : null;



                    // =====================================
                    // Personal Details
                    // =====================================

                    //response.Relation =
                    //    row["Relation"] != DBNull.Value
                    //        ? row["Relation"]?.ToString()
                    //        : null;

                    response.FatherOrHusbandName =
                        row["AllotteeFatherName"] != DBNull.Value
                            ? row["AllotteeFatherName"]?.ToString()
                            : null;

                    response.PANNo =
                        row["PanNumber"] != DBNull.Value
                            ? row["PanNumber"]?.ToString()
                            : null;

                    //response.AadhaarNo =
                    //    row["DocumentNumber"] != DBNull.Value
                    //        ? row["DocumentNumber"]?.ToString()
                    //        : null;

                    response.MobileNo =
                        row["MobileNo"] != DBNull.Value
                            ? row["MobileNo"]?.ToString()
                            : null;

                    // Owner Details
                    response.OwnerStateID =
                        row["StateId"] != DBNull.Value
                            ? Convert.ToInt32(row["StateId"])
                            : null;

                    response.OwnerDistrtictID =
                        row["DistrictId"] != DBNull.Value
                            ? Convert.ToInt32(row["DistrictId"])
                            : null;

                    response.OwnerCityID =
                        row["CityId"] != DBNull.Value
                            ? Convert.ToInt32(row["CityId"])
                            : null;

                    response.Address =
                        row["AllotteeAddress"] != DBNull.Value
                            ? row["AllotteeAddress"]?.ToString()
                            : null;
                }
                // =====================================
                // TABLE 2 - PropertyAuctionDetail
                // =====================================

                if (dataSet.Tables.Count > 2 &&
                    dataSet.Tables[2].Rows.Count > 0)
                {
                    var row = dataSet.Tables[2].Rows[0];
                    response.AuctionDate =
                      row["AuctionDate"] != DBNull.Value
                          ? Convert.ToDateTime(row["AuctionDate"])
                          : null;
                    // Financial Details
                    response.ReservePrice =
                        row["ReservePrice"] != DBNull.Value
                            ? Convert.ToDecimal(row["ReservePrice"])
                            : null;

                    response.FinalBidPrice =
                        row["SalesAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["SalesAmount"])
                            : null;



                    response.AllotmentDate =
                        row["DateOfAllotment"] != DBNull.Value
                            ? Convert.ToDateTime(row["DateOfAllotment"])
                            : null;

                    

                    // Outstanding
                    response.DueAmount =
                        row["BalanceAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["BalanceAmount"])
                            : null;

                   
                }

                response.InstallmentSchedules = new List<InstallmentScheduleDto>();

                if (dataSet.Tables.Count > 3 &&
                    dataSet.Tables[3].Rows.Count > 0)
                {
                    var table = dataSet.Tables[3];

                    foreach (DataRow row in table.Rows)
                    {
                        var schedule = new InstallmentScheduleDto
                        {

                            Id = row["InstallmentId"] != DBNull.Value
                                ? Convert.ToInt32(row["InstallmentId"])
                                : 0,

                            PropertyId = row["PropertyId"] != DBNull.Value
                                ? Convert.ToInt32(row["PropertyId"])
                                : 0,

                            PropertyCode = row["AllotteeCode"] != DBNull.Value
                                ? row["AllotteeCode"]?.ToString()
                                : null,

                            InstallmentNo = row["InstallmentNo"] != DBNull.Value
                                ? Convert.ToString(row["InstallmentNo"])
                                : null,

                            CalculatedDueDate = row["DueDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DueDate"])
                                : null,

                            BasePrincipal = row["DueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DueAmount"])
                                : 0,

                            Interest = row["Interest"] != DBNull.Value
                                ? Convert.ToDecimal(row["Interest"])
                                : 0,

                            TotalEstimatedAmount = row["TotalDueAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["TotalDueAmount"])
                                : 0
                        };

                        response.InstallmentSchedules.Add(schedule);
                    }
                }
                // =====================================
                // TABLE 5 - PropertyInstallmentDetails
                // =====================================

                response.Installments = new List<InstallmentDetailsDto>();

                if (dataSet.Tables.Count > 5 &&
                    dataSet.Tables[5].Rows.Count > 0)
                {
                    var table = dataSet.Tables[5];

                    foreach (DataRow row in table.Rows)
                    {
                        var installment = new InstallmentDetailsDto
                        {
                            Id = row["DraftId"] != DBNull.Value
                                ? Convert.ToInt32(row["DraftId"])
                                : 0,

                            ReceiptNo = row["ReceiptNo"] != DBNull.Value
                                ? row["ReceiptNo"]?.ToString()
                                : null,

                            ReceiptDate = row["ReceiptDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["ReceiptDate"])
                                : null,

                            DraftNo = row["DraftNo"] != DBNull.Value
                                ? row["DraftNo"]?.ToString()
                                : null,

                            DraftAmount = row["DraftAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["DraftAmount"])
                                : null,

                            DraftDate = row["DraftDate"] != DBNull.Value
                                ? Convert.ToDateTime(row["DraftDate"])
                                : null,

                            DraftBank = row["ChallanBank"] != DBNull.Value
                                ? row["DraftBankId"]?.ToString()
                                : null,

                            PrincipalAmount = row["PrincipalAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PrincipalAmount"])
                                : null,

                            InterestAmount = row["InterestAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["InterestAmount"])
                                : null,

                            OtherAmount = row["OtherAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["OtherAmount"])
                                : null,

                            PenaltyAmount = row["PenalityAmount"] != DBNull.Value
                                ? Convert.ToDecimal(row["PenalityAmount"])
                                : null,

                            PenaltyType = row["PenalityTypeId"] != DBNull.Value
                                ? row["PenalityTypeId"]?.ToString()
                                : null,

                            Remarks = row["Remarks"] != DBNull.Value
                                ? row["Remarks"]?.ToString()
                                : null,


                            //IsVerified = row["IsVerified"] != DBNull.Value
                            //    ? Convert.ToBoolean(row["IsVerified"])
                            //    : null
                        };

                        response.Installments.Add(installment);
                    }
                }

                if (dataSet.Tables.Count > 6 && dataSet.Tables[6].Rows.Count > 0)
                {
                    var row = dataSet.Tables[6].Rows[0];
                    // Form Fee
                    response.FormTransactionId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.FormTxnDate =
                        row["ReceiptDate"] != DBNull.Value
                            ? Convert.ToDateTime(row["ReceiptDate"])
                            : null;

                    response.FormPaidAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }
                if (dataSet.Tables.Count > 7 && dataSet.Tables[7].Rows.Count > 0)
                {
                    var row = dataSet.Tables[7].Rows[0];
                    // Form Fee
                    response.AllotmentTxnId =
                        row["DraftNo"] != DBNull.Value
                            ? row["DraftNo"]?.ToString()
                            : null;

                    response.AllotmentTransactionDate =
                       row["ReceiptDate"] != DBNull.Value
                           ? Convert.ToDateTime(row["ReceiptDate"])
                           : null;

                    response.AllotmentAmount =
                        row["DraftAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["DraftAmount"])
                            : null;
                }

                return ApiResponse<PropertyBidderRegistrationDto>.Ok(response,"Property details fetched successfully.");
            }
            catch (Exception ex)
            {
                var message = ex.Message;

                if (ex.InnerException != null)
                {
                    message += " | Inner: " + ex.InnerException.Message;
                }

                return ApiResponse<PropertyBidderRegistrationDto>.Fail(message);
            }
        }


        public async Task<ApiResponse<List<BranchDto>>> GetPropertyMandiBrancheByDistrictIdAsync(int districtId)
        {
            try
            {
                var branches = new List<BranchDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetMandiBranchByDistrictId";
                command.CommandType = CommandType.StoredProcedure;

                var districtParam = command.CreateParameter();
                districtParam.ParameterName = "@DistrictId";
                districtParam.Value = districtId;
                districtParam.DbType = DbType.Int32;

                command.Parameters.Add(districtParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    branches.Add(new BranchDto
                    {
                        BranchId = reader["BranchId"] != DBNull.Value
                            ? Convert.ToInt32(reader["BranchId"])
                            : 0,

                        BranchName = reader["BranchName"] != DBNull.Value
                            ? reader["BranchName"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<BranchDto>>.Ok(
                    branches,
                    "Branches fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<BranchDto>>.Fail(
                    $"Error while fetching branches: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<MandiDto>>> GetPropertyMandisByBranchIdAsync(int branchId)
        {
            try
            {
                var mandis = new List<MandiDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetMandiByBranchId";
                command.CommandType = CommandType.StoredProcedure;

                var branchParam = command.CreateParameter();
                branchParam.ParameterName = "@BranchId";
                branchParam.Value = branchId;
                branchParam.DbType = DbType.Int32;

                command.Parameters.Add(branchParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    mandis.Add(new MandiDto
                    {
                        MandiId = reader["MandiId"] != DBNull.Value
                            ? Convert.ToInt32(reader["MandiId"])
                            : 0,

                        MandiName = reader["MandiName"] != DBNull.Value
                            ? reader["MandiName"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<MandiDto>>.Ok(
                    mandis,
                    "Mandis fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MandiDto>>.Fail(
                    $"Error while fetching mandis: {ex.Message}"
                );
            }
        }

        public async Task<ApiResponse<List<PlotTypeDto>>> GetPropertyMandiPlotTypesAsync(int mandiId)
        {
            try
            {
                var plotTypes = new List<PlotTypeDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetMandiPlotTypeByMandiId";
                command.CommandType = CommandType.StoredProcedure;

                var mandiParam = command.CreateParameter();
                mandiParam.ParameterName = "@MandiId";
                mandiParam.Value = mandiId;
                mandiParam.DbType = DbType.Int32;

                command.Parameters.Add(mandiParam);

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    plotTypes.Add(new PlotTypeDto
                    {
                        PlotTypeId = reader["PlotTypeId"] != DBNull.Value
                            ? Convert.ToInt32(reader["PlotTypeId"])
                            : 0,

                        PlotType = reader["PlotType"] != DBNull.Value
                            ? reader["PlotType"].ToString()
                            : null
                    });
                }

                return ApiResponse<List<PlotTypeDto>>.Ok(
                    plotTypes,
                    "Plot types fetched successfully."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotTypeDto>>.Fail(
                    $"Error while fetching plot types: {ex.Message}"
                );
            }
        }

        public async Task<List<AuctionedPlotDto>> GetPlotsByPlotTypeAsync(int mandiId, int plotTypeId)
        {
            var result = new List<AuctionedPlotDto>();

            await using var connection = _context.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await using var command = connection.CreateCommand();

            command.CommandText = "sp_GetMandiPlotsbyPlottype";
            command.CommandType = CommandType.StoredProcedure;

            var mandiParameter = command.CreateParameter();
            mandiParameter.ParameterName = "@MandiId";
            mandiParameter.Value = mandiId;
            command.Parameters.Add(mandiParameter);

            var plotTypeParameter = command.CreateParameter();
            plotTypeParameter.ParameterName = "@PlotTypeId";
            plotTypeParameter.Value = plotTypeId;
            command.Parameters.Add(plotTypeParameter);

            await using var reader = await command.ExecuteReaderAsync();

            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < reader.FieldCount; i++)
            {
                columns.Add(reader.GetName(i));
            }

            while (await reader.ReadAsync())
            {
                var dto = new AuctionedPlotDto();
                if (columns.Contains("PlotNo") && reader["PlotNo"] != DBNull.Value)
                {
                    dto.PlotNo = Convert.ToInt32(reader["PlotNo"]);
                }
                result.Add(dto);
            }

            return result;
        }

        public async Task<ApiResponse<List<PlotSizesDto>>> GetPlotSizebyPlotNo(int mandiId, int plotTypeId, string plotNo)
        {
            try
            {
                var result = new List<PlotSizesDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "sp_GetPlotSizebyPlotNo";
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

                return ApiResponse<List<PlotSizesDto>>.Ok(result, result.Count > 0 ? "Plot size fetched successfully." : "No plot size found."
                );
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotSizesDto>>.Fail($"Error while fetching plot size: {ex.Message}"
                );
            }
        }
    }
}
