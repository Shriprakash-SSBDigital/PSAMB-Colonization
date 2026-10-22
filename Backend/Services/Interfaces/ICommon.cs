using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using static Backend.Models.Dtos.DistrictMasterDto;

namespace Backend.Services.Interfaces
{
    public interface ICommon
    {
        Task<ApiResponse<List<StateDto>>> GetAllStates();
        Task<List<DistrictDto>> GetAllDistrictsAsync(int stateid);
        Task<List<CityMasterDto>> GetAllCityByDistrictID(int districtid);
        Task<ApiResponse<List<MarketCommitteeDto>>> GetMarketCommitteesAsync(int? districtId);
        Task<ApiResponse<List<MandiDto>>> GetMandisByMarketCommiteeByDistrictAsync(int branchID);
        Task<ApiResponse<List<PlotTypeDto>>> GetPlotTypesAsync(int? propertyTypeId);
        Task<ApiResponse<List<PlotSizeDto>>> GetPlotSizesAsync();
        Task<ApiResponse<List<PlanDto>>> GetPlansAsync();
        Task<ApiResponse<List<PropertyTypeDto>>> GetPropertyTypesAsync();
        Task<ApiResponse<List<BidderTypeDto>>> GetBidderTypesAsync();
        Task<ApiResponse<List<ApplicationStatusDto>>> GetApplicationStatusesAsync();
        Task<ApiResponse<List<PropertyCategoryDto>>> GetPropertyCategoriesAsync();
        Task<ApiResponse<List<PlotTypeDto>>> GetPlotTypesByMandiIdAsync(int mandiId);
        Task<ApiResponse<List<PlotNoDto>>> GetPlotNoByPlotTypeID(int ploytypeid);
        Task<ApiResponse<List<PlotSizeDto>>> GetPlotSizeByPlotNo(int plotNo);
        Task<ApiResponse<PropertyOwnerDetailsDto>> GetPropertyDetailsByPlot(int? mandiId, int? plotTypeId, int? plotNo, string? plotSize);
        Task<ApiResponse<ApplicationUserProfileDto>> GetProfileDetailsByUserId(string userId);
        Task<ApiResponse<UserProfileImageDto>> GetProfileImageByUserIdAsync(string userId);
        Task<ApiResponse<ApplicationUserProfileDto>> SaveProfileChangesAsync(string userId, UpdateUserProfileDto dto);
    }
}
