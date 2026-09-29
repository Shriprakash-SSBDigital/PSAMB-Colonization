using Backend.Data;
using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using Backend.Models.Settings;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using System.Runtime;
using System.Windows.Input;
using static Azure.Core.HttpHeader;
using static Backend.Models.Dtos.DistrictMasterDto;

namespace Backend.Services.Implementations
{
    public class Common : ICommon
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly FileUploadSettings _settings;

        public Common(ApplicationDbContext context, IConfiguration config, IOptions<FileUploadSettings> settings)
        {
            _context = context;
            _config = config;
            _settings = settings.Value;

        }

        public async Task<ApiResponse<List<StateDto>>> GetAllStates()
        {
            try
            {
                var states = await _context.StateMasters
                    .Where(x => x.IsActive && !x.IsDeleted)
                    .Select(x => new StateDto
                    {
                        StateId = x.StateId,
                        StateName = x.StateName
                    })
                    .ToListAsync();

                if (states == null || states.Count == 0)
                {
                    return ApiResponse<List<StateDto>>.Fail("No states found");
                }

                return ApiResponse<List<StateDto>>.Ok(states, "States fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<StateDto>>.Fail(ex.Message);
            }
        }

        public async Task<List<DistrictDto>> GetAllDistrictsAsync(int stateid)
        {
            try
            {
                var districts = await _context.DistrictMasters.Where(x => x.IsActive == true && x.StateId==stateid ).ToListAsync();

                return districts.Select(x => new DistrictDto
                {
                    DistrictId = x.DistrictId,
                    DistrictName = x.DistrictName,
                    DistrictCode = x.DistrictCode,
                    DistrictPunjabiName = x.DistrictPunjabiName
                }).ToList();
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching districts", ex);
            }
        }

        public async Task<List<CityMasterDto>> GetAllCityByDistrictID(int districtid)
        {
            try
            {
                var districts = await _context.CityMasters.Where(x => x.IsActive == true && x.DistrictId == districtid).ToListAsync();

                return districts.Select(x => new CityMasterDto
                {
                    DistrictId = x.DistrictId,
                    CityId = x.CityId,
                    CityName = x.CityName,
                }).ToList();
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching districts", ex);
            }
        }

        public async Task<ApiResponse<List<MarketCommitteeDto>>> GetMarketCommitteesAsync(int? districtId)
        {
            try
            {
                var query = _context.BranchMaster.AsNoTracking().Where(x => x.DistrictId == districtId && x.IsActive && !x.IsDeleted);

                var list = await query
                    .Select(x => new MarketCommitteeDto
                    {
                        BranchId = x.BranchId,
                        BranchName = x.BranchName,
                        DistrictId = x.DistrictId,
                        RoleId = x.RoleId,
                        BranchCode = x.BranchCode
                    }).ToListAsync();

                return ApiResponse<List<MarketCommitteeDto>>.Ok(list, "Market Committees fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MarketCommitteeDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<MandiDto>>> GetMandisByMarketCommiteeByDistrictAsync(int branchID)
        {
            try
            {
                var list = await (from b in _context.BranchMaster
                                  join ba in _context.BranchMandiAssociation on b.BranchId equals ba.BranchId
                                  join m in _context.MandiMaster on ba.MandiId equals m.MandiId
                                  where b.BranchId == branchID && b.IsActive && !b.IsDeleted && m.IsActive && !m.IsDeleted
                                  select new MandiDto
                                  {
                                      MandiId = m.MandiId,
                                      DistrictId = m.DistrictId,
                                      MandiName = m.MandiName,
                                      MandiCode = m.MandiCode
                                  }
                    ).Distinct().ToListAsync();


                return ApiResponse<List<MandiDto>>.Ok(list, "Mandi fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MandiDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PlotTypeDto>>> GetPlotTypesAsync(int? propertyTypeId)
        {
            try
            {
                var query = _context.PlotTypeMaster.AsNoTracking().Where(x => x.IsActive == true && x.IsDeleted != true);

                if (propertyTypeId.HasValue)
                {
                    query = query.Where(x => x.PropertyTypeId == propertyTypeId.Value);
                }

                var list = await query.Select(x => new PlotTypeDto
                {
                    PlotTypeId = x.PlotTypeId,
                    PlotType = x.PlotType,
                    PropertyTypeId = x.PropertyTypeId
                })
                    .ToListAsync();

                return ApiResponse<List<PlotTypeDto>>.Ok(list, "Plot types fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotTypeDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PlotSizeDto>>> GetPlotSizesAsync()
        {
            try
            {
                var list = await _context.PlotSizeMaster.AsNoTracking().Where(x => x.IsActive == true && x.IsDeleted != true).Select(x => new PlotSizeDto
                {
                    PlotSizeId = x.PlotSizeId,
                    PlotSize = x.PlotSize
                })
                    .ToListAsync();

                return ApiResponse<List<PlotSizeDto>>.Ok(list, "Plot sizes fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotSizeDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PlanDto>>> GetPlansAsync()
        {
            try
            {
                var list = await _context.PlanMaster.AsNoTracking().Where(x => x.IsActive == true && x.IsDeleted != true).Select(x => new PlanDto
                {
                    PlanId = x.PlanId,
                    PlanName = x.PlanName,
                    PlanSanctionDate = x.PlanSanctionDate
                })
                    .ToListAsync();

                return ApiResponse<List<PlanDto>>.Ok(list, "Plans fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlanDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PropertyTypeDto>>> GetPropertyTypesAsync()
        {
            try
            {
                var list = await _context.PropertyType.AsNoTracking().Where(x => x.IsActive && !x.IsDeleted).Select(x => new PropertyTypeDto
                {
                    PropertyTypeId = x.PropertyTypeId,
                    PropertyTypeName = x.PropertyTypeName
                })
                    .ToListAsync();

                return ApiResponse<List<PropertyTypeDto>>.Ok(list, "Property types fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PropertyTypeDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<BidderTypeDto>>> GetBidderTypesAsync()
        {
            try
            {
                var list = await _context.BidderTypeMaster.AsNoTracking().Where(x => x.IsActive && !x.IsDeleted).Select(x => new BidderTypeDto
                {
                    BidderTypeId = x.BidderTypeId,
                    BidderTypeName = x.BidderTypeName
                })
                    .ToListAsync();

                return ApiResponse<List<BidderTypeDto>>.Ok(list, "Bidder types fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<BidderTypeDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<ApplicationStatusDto>>> GetApplicationStatusesAsync()
        {
            try
            {
                var list = await _context.ApplicationStatusMaster.AsNoTracking().Where(x => x.IsActive && !x.IsDeleted).Select(x => new ApplicationStatusDto
                {
                    ApplicationStatusId = x.ApplicationStatusId,
                    ApplicationStatusName = x.ApplicationStatusName
                })
                    .ToListAsync();

                return ApiResponse<List<ApplicationStatusDto>>.Ok(list, "Application statuses fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<ApplicationStatusDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PropertyCategoryDto>>> GetPropertyCategoriesAsync()
        {
            try
            {
                var list = await _context.PropertyCategoryMaster.AsNoTracking()
                    .Where(x => x.IsActive && !x.IsDeleted)
                    .Select(x => new PropertyCategoryDto
                    {
                        PropertyCategoryId = x.PropertyCategoryId,
                        CategoryName = x.CategoryName
                    })
                    .ToListAsync();

                return ApiResponse<List<PropertyCategoryDto>>.Ok(list, "Property categories fetched successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PropertyCategoryDto>>.Fail(ex.Message);
            }
        }

        public async Task<ApiResponse<List<PlotTypeDto>>> GetPlotTypesByMandiIdAsync(int mandiId)
        {
            var userRecord = await _context.PropertyBidderRegistration.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);

            if (userRecord == null)
            {
                return ApiResponse<List<PlotTypeDto>>.Fail( "No record found");
            }

            var plotTypes = await _context.PropertyBidderRegistration.AsNoTracking() .Where(x =>  x.MandiId == mandiId && x.IsActive && !x.IsDeleted && x.PlotTypeId.HasValue)
                .Select(x => new PlotTypeDto
                {
                    PlotTypeId = x.PlotTypeId!.Value,
                    PlotType = x.PlotType.PlotType
                })
                .Distinct().ToListAsync();

            if (!plotTypes.Any())
            {
                return ApiResponse<List<PlotTypeDto>>.Fail("No plot types found against the selected mandi.");
            }

            return ApiResponse<List<PlotTypeDto>>.Ok(plotTypes, "Plot types retrieved successfully.");
        }

        public async Task<ApiResponse<List<PlotNoDto>>> GetPlotNoByPlotTypeID(int ploytypeid)
        {
            var userRecord = await _context.PropertyBidderRegistration.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);

            if (userRecord == null)
            {
                return ApiResponse<List<PlotNoDto>>.Fail("No record found");
            }

            var plotTypes = await _context.PropertyBidderRegistration.AsNoTracking().Where(x => x.PlotTypeId == ploytypeid && x.IsActive && !x.IsDeleted)
                .Select(x => new PlotNoDto
                {
                    PlotTypeId = x.PlotTypeId!.Value,
                    PlotNo = x.PlotNo.Value
                })
                .ToListAsync();

            if (!plotTypes.Any())
            {
                return ApiResponse<List<PlotNoDto>>.Fail("No plot no found against the selected mandi.");
            }

            return ApiResponse<List<PlotNoDto>>.Ok(plotTypes, "Plot no retrieved successfully.");
        }

        public async Task<ApiResponse<List<PlotSizeDto>>> GetPlotSizeByPlotNo(int plotNo)
        {
            var userRecord = await _context.PropertyBidderRegistration.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);

            if (userRecord == null)
            {
                return ApiResponse<List<PlotSizeDto>>.Fail("No record found");
            }

            var plotTypes = await _context.PropertyBidderRegistration.AsNoTracking().Where(x => x.PlotNo == plotNo && x.IsActive && !x.IsDeleted)
                .Select(x => new PlotSizeDto
                {
                    //PlotSizeId = x.PlotSize!.Value,
                    PlotSize = x.PlotSize
                })
                .ToListAsync();

            if (!plotTypes.Any())
            {
                return ApiResponse<List<PlotSizeDto>>.Fail("No plot size found against the selected mandi.");
            }

            return ApiResponse<List<PlotSizeDto>>.Ok(plotTypes, "Plot size retrieved successfully.");
        }

        public async Task<ApiResponse<PropertyOwnerDetailsDto>> GetPropertyDetailsByPlot(int? mandiId, int? plotTypeId, int? plotNo, string? plotSize)
        {
            var query = from p in _context.PropertyBidderRegistration.AsNoTracking()
                        join u in _context.ApplicationUsers.AsNoTracking()
                            on (p.ApplicantId > 0 ? (long)p.ApplicantId : (p.CreatedBy ?? 0)) equals u.ApplicantId into userJoin
                        from u in userJoin.DefaultIfEmpty()
                        where p.IsActive && !p.IsDeleted
                        select new { p, u };

            if (mandiId.HasValue && mandiId > 0) 
                query = query.Where(x => x.p.MandiId == mandiId.Value);

            if (plotTypeId.HasValue && plotTypeId > 0) 
                query = query.Where(x => x.p.PlotTypeId == plotTypeId.Value);

            if (plotNo.HasValue && plotNo > 0) 
                query = query.Where(x => x.p.PlotNo == plotNo.Value);
            if (!string.IsNullOrEmpty(plotSize))
            {
                var data = plotSize.Trim();
                query = query.Where(x => x.p.PlotSize != null && (x.p.PlotSize.Trim() == data || x.p.PlotSize.Trim().StartsWith(data) || data.StartsWith(x.p.PlotSize.Trim())));
            }

            var item = await query.FirstOrDefaultAsync();

            if (item == null)
            {
                if (plotNo.HasValue && plotNo > 0)
                {
                    var fallbackQuery = from p in _context.PropertyBidderRegistration.AsNoTracking()
                                        join u in _context.ApplicationUsers.AsNoTracking()
                                            on (p.ApplicantId > 0 ? (long)p.ApplicantId : (p.CreatedBy ?? 0)) equals u.ApplicantId into userJoin
                                        from u in userJoin.DefaultIfEmpty()
                                        where p.IsActive && !p.IsDeleted && p.PlotNo == plotNo.Value
                                        select new { p, u };
                    if (mandiId.HasValue && mandiId > 0) 
                        fallbackQuery = fallbackQuery.Where(x => x.p.MandiId == mandiId.Value);
                    item = await fallbackQuery.FirstOrDefaultAsync();
                }

                if (item == null)
                {
                    return ApiResponse<PropertyOwnerDetailsDto>.Fail("No property record found for the selected plot details.");
                }
            }

            var dto = new PropertyOwnerDetailsDto
            {
                Id = item.p.Id,
                PropertyCode = item.p.PropertyCode,
                MandiId = item.p.MandiId,
                BranchId = item.p.BranchId,
                DistrictId = item.p.DistrictId,
                PlotTypeId = item.p.PlotTypeId,
                PlotNo = item.p.PlotNo,
                PlotSize = item.p.PlotSize,
                CurrentOwnerName = !string.IsNullOrWhiteSpace(item.p.BidderName) ? item.p.BidderName : (item.u != null ? $"{item.u.FirstName} {item.u.LastName}".Trim() : ""),
                GuardianName = !string.IsNullOrWhiteSpace(item.p.FatherOrHusbandName) ? item.p.FatherOrHusbandName : (item.u != null ? $"{item.u.FatherHusbandFirstName} {item.u.FatherHusbandLastName}".Trim() : ""),
                MobileNumber = !string.IsNullOrWhiteSpace(item.p.MobileNo) ? item.p.MobileNo : (item.u != null ? item.u.MobileNo : ""),
                Email = !string.IsNullOrWhiteSpace(item.p.Email) ? item.p.Email : (item.u != null ? item.u.Email : ""),
                State = (item.p.OwnerStateID.HasValue && item.p.OwnerStateID.Value > 0)
                    ? item.p.OwnerStateID
                    : ((item.u != null && item.u.IndividualStateId.HasValue && item.u.IndividualStateId.Value > 0) ? item.u.IndividualStateId : null),
                OwnerDistrict = (item.p.OwnerDistrtictID.HasValue && item.p.OwnerDistrtictID.Value > 0)
                    ? item.p.OwnerDistrtictID
                    : ((item.u != null && item.u.IndividualDistrictId.HasValue && item.u.IndividualDistrictId.Value > 0) ? item.u.IndividualDistrictId : null),
                City = (item.p.OwnerCityID.HasValue && item.p.OwnerCityID.Value > 0)
                    ? item.p.OwnerCityID
                    : ((item.u != null && item.u.IndividualCityId.HasValue && item.u.IndividualCityId.Value > 0) ? item.u.IndividualCityId : null),
                Address = !string.IsNullOrWhiteSpace(item.p.Address) ? item.p.Address : (item.u != null ? item.u.IndividualPlotStreetLandmark : ""),
                AadhaarNumber = !string.IsNullOrWhiteSpace(item.p.AadhaarNo) ? item.p.AadhaarNo : (item.u != null ? item.u.IdentDocNumber : ""),
                PanNo = !string.IsNullOrWhiteSpace(item.p.PANNo) ? item.p.PANNo : (item.u != null ? item.u.PANNumber : ""),
                AadhaarDocPath = item.u != null ? item.u.IdentDocPath : null,
                PanDocPath = item.u != null ? item.u.PANDocPath : null,
                AddrDocPath = item.u != null ? item.u.AddrDocPath : null,
                PhotoPath = item.u != null ? item.u.PhotoPath : null
            };

            return ApiResponse<PropertyOwnerDetailsDto>.Ok(dto, "Property details retrieved successfully.");
        }

        public async Task<ApiResponse<ApplicationUserProfileDto>> GetProfileDetailsByUserId(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return ApiResponse<ApplicationUserProfileDto>.Fail(
                        "User ID is required.");
                }

                var user = await (
                    from application in _context.ApplicationUsers

                    join state in _context.StateMasters
                      on application.IndividualStateId equals state.StateId
                      into stateGroup
                    from state in stateGroup.DefaultIfEmpty()

                    join district in _context.DistrictMasters
                        on application.IndividualDistrictId equals district.DistrictId
                        into districtGroup
                    from district in districtGroup.DefaultIfEmpty()

                    join city in _context.CityMasters
                        on application.IndividualCityId equals city.CityId
                        into cityGroup
                    from city in cityGroup.DefaultIfEmpty()

                    where application.IdentityUserId == userId
                          && !application.IsDeleted

                    select new
                    {
                        ApplicationUser = application,
                        State = state,
                        District = district,
                        City = city
                    }
                ).FirstOrDefaultAsync();

                if (user == null)
                {
                    return ApiResponse<ApplicationUserProfileDto>.Fail(
                        "No profile found for the given user.");
                }

                var applicationUser = user.ApplicationUser;

                var dto = new ApplicationUserProfileDto
                {
                    ApplicantId = applicationUser.ApplicantId,
                    IdentityUserId = applicationUser.IdentityUserId,

                    FirstName = applicationUser.FirstName,
                    LastName = applicationUser.LastName,
                    Email = applicationUser.Email,
                    MobileNo = applicationUser.MobileNo,
                    FatherHusbandFirstName = applicationUser.FirstName,
                    MotherFirstName = applicationUser.FirstName,

                    IndividualStateId = applicationUser.IndividualStateId,
                    IndividualDistrictId = applicationUser.IndividualDistrictId,
                    IndividualCityId = applicationUser.IndividualCityId,

                    IndividualPinCode = applicationUser.IndividualPinCode,
                    IndividualPlotStreetLandmark =applicationUser.IndividualPlotStreetLandmark,

                    StateName = user.State?.StateName,
                    DistrictName = user.District?.DistrictName,
                    CityName = user.City?.CityName,

                    IsDeleted = applicationUser.IsDeleted,
                    IsActive = applicationUser.IsActive,

                    CreatedDate = applicationUser.CreatedDate,
                    CreatedBy = applicationUser.CreatedBy
                };

                return ApiResponse<ApplicationUserProfileDto>.Ok(
                    dto,
                    "Profile details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<ApplicationUserProfileDto>.Fail(
                    $"Error while fetching profile details: {ex.Message}");
            }
        }

        public async Task<ApiResponse<UserProfileImageDto>> GetProfileImageByUserIdAsync(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return ApiResponse<UserProfileImageDto>.Fail("User ID is required.");
                }

                var applicantId = await _context.ApplicationUsers.Where(x => x.IdentityUserId == userId && !x.IsDeleted) .Select(x => x.ApplicantId).FirstOrDefaultAsync();

                if (applicantId == 0)
                {
                    return ApiResponse<UserProfileImageDto>.Fail("Application user not found.");
                }

                var document = await _context.UserDocuments.Where(x => x.ApplicantId == applicantId &&!x.IsDeleted &&x.IsActive &&
                        (
                            (x.FolderPath != null &&
                             x.FolderPath.Contains("Photograph")) ||
                            (x.RelativePath != null &&
                             x.RelativePath.Contains("Photograph"))
                        ))
                    .OrderByDescending(x => x.CreatedDate)
                    .Select(x => new
                    {
                        x.OriginalFileName,
                        x.StoredFileName,
                        x.RelativePath,
                        x.FolderPath,
                        x.ContentType,
                        x.TempSessionId
                    })
                    .FirstOrDefaultAsync();

                if (document == null)
                {
                    return ApiResponse<UserProfileImageDto>.Fail("Profile photograph not found.");
                }

                var relativePath = !string.IsNullOrWhiteSpace(document.RelativePath)
                    ? document.RelativePath : document.FolderPath;

                if (string.IsNullOrWhiteSpace(relativePath))
                {
                    return ApiResponse<UserProfileImageDto>.Fail("Profile photograph path not found.");
                }

                var rootPath = _settings.RootPath;

                relativePath = relativePath.Replace("/", Path.DirectorySeparatorChar.ToString()).TrimStart(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);

                var filePath = Path.Combine(rootPath, relativePath);

                if (!File.Exists(filePath))
                {
                    return ApiResponse<UserProfileImageDto>.Fail(
                        $"Profile photograph file not found.");
                }

                var fileData = await File.ReadAllBytesAsync(filePath);

                var result = new UserProfileImageDto
                {
                    FileName      = document.OriginalFileName ?? document.StoredFileName,
                    ContentType   = document.ContentType ?? "application/octet-stream",
                    FilePath      = filePath,
                    TempSessionId = document.TempSessionId
                };

                return ApiResponse<UserProfileImageDto>.Ok(result,"Profile photograph fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<UserProfileImageDto>.Fail($"Error while fetching profile photograph: {ex.Message}");
            }
        }
    }
}
