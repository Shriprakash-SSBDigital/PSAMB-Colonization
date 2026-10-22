using Backend.Services.Implementations;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportController(IReportService service)
        {
            _service = service;
        }

        [HttpGet("GetMandiWiseAllotmentSummary")]
        public async Task<IActionResult> GetMandiWiseAllotmentSummary([FromQuery] int districtId=0, [FromQuery] int branchId = 0,[FromQuery] int mandiId = 0, int pageNumber = 1,
        int pageSize = 10, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            var response = await _service.GetMandiWiseAllotmentSummaryAsync(districtId,branchId, mandiId, pageNumber, pageSize, fromDate, toDate);

            return Ok(response);
        }

        [HttpGet("ExportMandiWiseAllotmentSummary")]
        public async Task<IActionResult> ExportMandiWiseAllotmentSummary(int districtId, int branchId, int mandiId, DateTime? fromDate = null, DateTime? toDate = null, [FromQuery] string? columns = null)
        {
            try
            {
                byte[] fileBytes = await _service.ExportGetMandiWiseAllotmentSummaryAsync(districtId, branchId, mandiId, fromDate, toDate, columns);

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "MandiWiseAllotmentSummary.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode( StatusCodes.Status500InternalServerError,  new { message = ex.Message });
            }
        }

        [HttpGet("ExportMandiWiseAllotmentSummaryPdf")]
        public async Task<IActionResult> ExportMandiWiseAllotmentSummaryPdf([FromQuery] int? districtId, [FromQuery] int? branchId, [FromQuery] int? mandiId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? columns = null)
        {
            var pdfBytes = await _service.ExportMandiWiseAllotmentSummaryPdfAsync(districtId, branchId, mandiId, fromDate, toDate, columns);

            return File(pdfBytes,"application/pdf","MandiWiseAllotmentSummary.pdf");
        }

        [HttpGet("GetMandisForPropertyReport")]
        public async Task<IActionResult> GetMandisForPropertyReport()
        {
            var response = await _service.GetMandisForPropertyReportAsync();

            return Ok(response);
        }

        [HttpGet("GetPlotWiseConsolidateDetails")]
        public async Task<IActionResult> GetPlotWiseConsolidateDetails([FromQuery] long mandiId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var response = await _service.GetPlotWiseConsolidateDetailsAsync(mandiId, pageNumber, pageSize);

            return Ok(response);
        }

        [HttpGet("ExportPlotWiseConsolidateDetails")]
        public async Task<IActionResult> ExportPlotWiseConsolidateDetails([FromQuery] long mandiId)
        {
            try
            {
                byte[] fileBytes = await _service.ExportPlotWiseConsolidateDetailsAsync(mandiId);
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"PlotWiseConsolidateDetails_{mandiId}.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("ExportPlotWiseConsolidateDetailsPdf")]
        public async Task<IActionResult> ExportPlotWiseConsolidateDetailsPdf([FromQuery] long mandiId)
        {
            try
            {
                var pdfBytes = await _service.ExportPlotWiseConsolidateDetailsPdfAsync(mandiId);
                return File(pdfBytes, "application/pdf", $"PlotWiseConsolidateDetails_{mandiId}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("GetPlotSoldUnsoldDetails")]
        public async Task<IActionResult> GetPlotSoldUnsoldDetails([FromQuery] int districtId = 0, [FromQuery] int branchId = 0, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var response = await _service.GetPlotSoldUnsoldDetailsAsync(districtId, branchId, pageNumber, pageSize);

            return Ok(response);
        }

        [HttpGet("ExportPlotSoldUnsoldDetails")]
        public async Task<IActionResult> ExportPlotSoldUnsoldDetails([FromQuery] int districtId = 0, [FromQuery] int branchId = 0)
        {
            try
            {
                byte[] fileBytes = await _service.ExportPlotSoldUnsoldDetailsAsync(districtId, branchId);
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"PlotSoldUnsoldDetails_{DateTime.Now:yyyyMMdd}.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("ExportPlotSoldUnsoldDetailsPdf")]
        public async Task<IActionResult> ExportPlotSoldUnsoldDetailsPdf([FromQuery] int districtId = 0, [FromQuery] int branchId = 0)
        {
            try
            {
                byte[] pdfBytes = await _service.ExportPlotSoldUnsoldDetailsPdfAsync(districtId, branchId);
                return File(pdfBytes, "application/pdf", $"PlotSoldUnsoldDetails_{DateTime.Now:yyyyMMdd}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("GetDigitizationPropertyDayWiseCountAsync")]
        public async Task<IActionResult> GetDigitizationPropertyDayWiseCountAsync([FromQuery] DateTime fromDate,  [FromQuery] DateTime toDate, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var response = await _service.GetDigitizationPropertyDayWiseCountAsync(fromDate, toDate, pageNumber,pageSize);

            return Ok(response);
        }

        [HttpGet("ExportDigitizationPropertyDayWiseSummary")]
        public async Task<IActionResult> ExportDigitizationPropertyDayWiseSummary([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            try
            {
                byte[] fileBytes = await _service.ExportDigitizationPropertyDayWiseSummaryAsync(fromDate, toDate);
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"DigitizationPropertySummary_{fromDate:yyyyMMdd}_to_{toDate:yyyyMMdd}.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("ExportDigitizationPropertyDayWiseSummaryPdf")]
        public async Task<IActionResult> ExportDigitizationPropertyDayWiseSummaryPdf([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            try
            {
                byte[] pdfBytes = await _service.ExportDigitizationPropertyDayWiseSummaryPdfAsync(fromDate, toDate);
                return File(pdfBytes, "application/pdf", $"DigitizationPropertySummary_{fromDate:yyyyMMdd}_to_{toDate:yyyyMMdd}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet("GetDigitizationPropertyDayWiseCountDetailsAsync")]
        public async Task<IActionResult> GetDigitizationPropertyDayWiseCountDetailsAsync([FromQuery] DateTime fromDate)
        {
            var response = await _service.GetDigitizationPropertyDayWiseCountDetailsAsync( fromDate);

            return Ok(response);
        }

        [HttpGet("GetAllMandisForMandiWiseAllotmentSummaryAsync")]
        public async Task<IActionResult> GetAllMandisForMandiWiseAllotmentSummaryAsync(string? search)
        {
            var response = await _service.GetAllMandisForMandiWiseAllotmentSummaryAsync(search);

            return Ok(response);
        }
    }
}
