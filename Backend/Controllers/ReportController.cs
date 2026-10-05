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
    }
}
