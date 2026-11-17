using Microsoft.AspNetCore.Mvc;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace Backend.Controllers
{
   
        [ApiController]
        [AllowAnonymous]                                 
        [Route("api/open/dashboard")]
        public class DashboardController : ControllerBase
        {
            private readonly IDashboardService _service;

            public DashboardController(IDashboardService service)
            {
                _service = service;
            }

            [HttpGet("property-summary")]
            public async Task<IActionResult> PropertySummary()
            {
                try
                {
                    var data = await _service.GetPropertySummaryAsync();
                    return Ok(new { success = true, responseData = data });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { success = false, message = ex.Message });
                }
            }
        }
    }