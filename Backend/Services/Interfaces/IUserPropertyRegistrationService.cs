using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using Backend.Services.Implementations;

namespace Backend.Services.Interfaces
{
    public interface IUserPropertyRegistrationService
    {
        Task<ApiResponse<UserPropertyRegistrationDto>> UserPropertyRegisterAsync(UserPropertyRegistrationDto dto);
        Task<ApiResponse<List<PlotSizesDto>>> GetMandiPlotSizeByPlotNoAsync(int mandiId,int plotTypeId,  string plotNo);
        Task<ApiResponse<List<UserPropertyRegistrationDto>>> GetPropertyOwnerVerificationAsync(string? userid, string? searchCode, int districtId, int branchId, int mandiid);
        Task<ApiResponse<bool>> VerifyByClerkForUser(ClerkVerificationDto dto);
        Task<ApiResponse<List<UserDocumentResponseDto>>> GetUserDocumentsByUserIDAsync(int applicantID);
        Task<ApiResponse<List<UserPropertyRegistrationDto>>> GetAllUserRegisterPropertyById(string userid);


    }
}
