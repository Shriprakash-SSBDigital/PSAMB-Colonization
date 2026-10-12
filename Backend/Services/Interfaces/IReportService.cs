using Backend.Helpers;
using Backend.Models.DTOs;

namespace Backend.Services.Interfaces
{
    public interface IReportService
    {
        Task<ApiResponse<List<ReportDto>>> GetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId);
        Task<ApiResponse<List<MandiForPropertyReportDto>>> GetMandisForPropertyReportAsync();
        Task<ApiResponse<List<PlotWiseConsolidateDetailsDto>>> GetPlotWiseConsolidateDetailsAsync(long mandiId);
        Task<ApiResponse<List<PlotSoldUnsoldDto>>> GetPlotSoldUnsoldDetailsAsync(int districtId = 0, int branchId = 0);
        Task<ApiResponse<List<DigitizationPropertyDayWiseDto>>> GetDigitizationPropertyDayWiseCountAsync(DateTime fromDate, DateTime toDate);

        Task<ApiResponse<List<DigitizationPropertyDayWiseDetailsDto>>> GetDigitizationPropertyDayWiseCountDetailsAsync(DateTime fromDate);
    }
}

