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
        public async Task<IActionResult> GetMandiWiseAllotmentSummary([FromQuery] int districtId=0, [FromQuery] int branchId = 0,[FromQuery] int mandiId = 0)
        {
            var response = await _service.GetMandiWiseAllotmentSummaryAsync(districtId,branchId, mandiId);

            return Ok(response);
        }

        [HttpGet("GetMandisForPropertyReport")]
        public async Task<IActionResult> GetMandisForPropertyReport()
        {
            var response = await _service.GetMandisForPropertyReportAsync();

            return Ok(response);
        }

        [HttpGet("GetPlotWiseConsolidateDetails")]
        public async Task<IActionResult> GetPlotWiseConsolidateDetails([FromQuery] long mandiId)
        {
            var response = await _service.GetPlotWiseConsolidateDetailsAsync(mandiId);

            return Ok(response);
        }

        [HttpGet("GetPlotSoldUnsoldDetails")]
        public async Task<IActionResult> GetPlotSoldUnsoldDetails(int districtId = 0,int branchId = 0)
        {
            var response = await _service.GetPlotSoldUnsoldDetailsAsync(districtId,branchId);

            return Ok(response);
        }

        [HttpGet("GetDigitizationPropertyDayWiseCountAsync")]
        public async Task<IActionResult> GetDigitizationPropertyDayWiseCountAsync([FromQuery] DateTime fromDate,  [FromQuery] DateTime toDate)
        {
            var response = await _service.GetDigitizationPropertyDayWiseCountAsync(fromDate, toDate);

            return Ok(response);
        }

        [HttpGet("GetDigitizationPropertyDayWiseCountDetailsAsync")]
        public async Task<IActionResult> GetDigitizationPropertyDayWiseCountDetailsAsync([FromQuery] DateTime fromDate)
        {
            var response = await _service.GetDigitizationPropertyDayWiseCountDetailsAsync( fromDate);

            return Ok(response);
        }
    }
}
