using Backend.Helpers;
using Backend.Models.DTOs;

namespace Backend.Services.Interfaces
{
    public interface IReportService
    {
        Task<ApiResponse<List<ReportDto>>> GetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId);
    }
}
