using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using static Backend.Models.Dtos.DistrictMasterDto;

namespace Backend.Services.Interfaces
{
    public interface IPropertyBidderRegistration
    {
        Task<ApiResponse<PropertyBidderRegistrationDto>> RegisterPropertyAsync(PropertyBidderRegistrationDto dto);
        Task<ApiResponse<PropertyBidderRegistrationDto>> GetRegistrationByIdAsync(int id);
        Task<ApiResponse<PropertyBidderRegistrationDto>> GetRegistrationByPropertyCodeAsync(string propertyCode);
        Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetAllRegistrationsAsync();
        Task<ApiResponse<PropertyBidderRegistrationDto>> UpdateRegisterPropertyAsync(PropertyBidderRegistrationDto dto);
        Task<ApiResponse<List<PropertyBidderRegistrationDto>>> GetPendingForClerk(string? userId=null,string? searchCode = null,int disctrictid =0, int branchid = 0,int mandiid = 0);
        Task<ApiResponse<bool>> VerifyByClerk(ClerkVerificationDto dto);
        Task<ApiResponse<PropertyBidderRegistrationDto>> GetPropertyEAuctionDetailsByPropertyCodeAsync(string propertyCode, bool isSold = false);
        Task<ApiResponse<List<DistrictDto>>> GetPropertyDistrictsAsync();
        Task<ApiResponse<List<BranchDto>>> GetPropertyBranchesAsync(int districtId);
        Task<ApiResponse<List<MandiDto>>> GetPropertyMandisAsync(int branchId);
        Task<ApiResponse<List<PlotTypeDto>>> GetPropertyPlotTypesAsync(int mandiId);
        Task<List<AuctionedPlotDto>> GetAuctionedPlotsAsync(int mandiId, int plotTypeId);

        Task<ApiResponse<PropertyBidderRegistrationDto>> GetPropertyDetailsByMandiPlot(int MandiId,int PlotTypeId,string PlotNo, string PlotSize, bool isSold = false);
        Task<ApiResponse<List<DistrictMasterDto>>> GetDistrictByHRMSUser(string v);
        Task<ApiResponse<List<PropertyBidderRegistration>>> GetAllRegisterPropertyById(string v);
        Task<ApiResponse<PropertyBidderRegistrationDto>> GetBiderPropertyDetailsByMandiPlotAsync(int mandiId, int plotTypeId, string plotNo, string plotSize);
        Task<ApiResponse<List<BranchDto>>> GetPropertyMandiBrancheByDistrictIdAsync(int districtId);
        Task<ApiResponse<List<MandiDto>>> GetPropertyMandisByBranchIdAsync(int branchId);
        Task<ApiResponse<List<PlotTypeDto>>> GetPropertyMandiPlotTypesAsync(int mandiId);
        Task<List<AuctionedPlotDto>> GetPlotsByPlotTypeAsync(int mandiId, int plotTypeId);
        Task<ApiResponse<List<PlotSizesDto>>> GetPlotSizebyPlotNo(int mandiId, int plotTypeId, string plotNo);

    }
}
