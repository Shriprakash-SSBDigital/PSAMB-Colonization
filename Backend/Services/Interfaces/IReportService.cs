using Backend.Helpers;
using Backend.Models.DTOs;

namespace Backend.Services.Interfaces
{
    public interface IReportService
    {
        Task<ApiResponse<PagedResponse<ReportDto>>> GetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId, int pageNumber = 1,
        int pageSize = 10, DateTime? fromDate = null, DateTime? toDate = null);

        Task<byte[]> ExportGetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<byte[]> ExportMandiWiseAllotmentSummaryPdfAsync(int? districtId, int? branchId, int? mandiId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<ApiResponse<List<MandiForPropertyReportDto>>> GetMandisForPropertyReportAsync();
        Task<ApiResponse<List<PlotWiseConsolidateDetailsDto>>> GetPlotWiseConsolidateDetailsAsync(long mandiId);
        Task<ApiResponse<List<PlotSoldUnsoldDto>>> GetPlotSoldUnsoldDetailsAsync(int districtId = 0, int branchId = 0);
        Task<ApiResponse<List<DigitizationPropertyDayWiseDto>>> GetDigitizationPropertyDayWiseCountAsync(DateTime fromDate, DateTime toDate);

        Task<ApiResponse<List<DigitizationPropertyDayWiseDetailsDto>>> GetDigitizationPropertyDayWiseCountDetailsAsync(DateTime fromDate);
        Task<ApiResponse<List<MandiWiseAllotmentSummaryDto>>> GetAllMandisForMandiWiseAllotmentSummaryAsync(string? search);
    }
}

