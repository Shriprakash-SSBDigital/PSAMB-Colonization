using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PropertyBidderRegnController : ControllerBase
    {
        private readonly IPropertyBidderRegistration _service;

        public PropertyBidderRegnController(IPropertyBidderRegistration service)
        {
            _service = service;
        }

        [HttpPost("registerProperty")]
        public async Task<IActionResult> RegisterProperty([FromBody] Models.Dtos.PropertyBidderRegistrationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _service.RegisterPropertyAsync(dto);
            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }


        [HttpGet("getAllRegisterPropertyById")]
        public async Task<IActionResult> GetAllRegisterPropertyById()
        {
            var response = await _service.GetAllRegisterPropertyById(GetUserId());
            if (!response.Success)
            {
                return NotFound(response);
            }

            return Ok(response);
        }

        [HttpGet("getRegistrationById")]
        public async Task<IActionResult> GetRegistrationById(int id)
        {
            var response = await _service.GetRegistrationByIdAsync(id);
            if (!response.Success)
            {
                return NotFound(response);
            }

            return Ok(response);
        }

        [HttpGet("getAllPropertyRegistrations")]
        public async Task<IActionResult> GetAllRegistrations()
        {
            var response = await _service.GetAllRegistrationsAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }

        [HttpGet("search/{propertyCode}")]
        public async Task<IActionResult> GetRegistrationByPropertyCode(string propertyCode)
        {
            var response = await _service.GetRegistrationByPropertyCodeAsync(propertyCode);
            //if (!response.Success)
            //{
            //    if (response.Message == "no record found")
            //    {
            //        return NotFound(response);
            //    }
            //    return BadRequest(response);
            //}

            return Ok(response);
        }

        [HttpGet("GetPropertyEAuctionDetailsByPropertyCodeAsync/{propertyCode}")]
        public async Task <IActionResult> GetPropertyEAuctionDetailsByPropertyCodeAsync(string propertyCode, [FromQuery] bool isSold = false)
        {
            var response = await _service.GetPropertyEAuctionDetailsByPropertyCodeAsync(propertyCode, isSold);
            //if (!response.Success)
            //{
            //    if (response.Message == "no record found")
            //    {
            //        return NotFound(response);
            //    }
            //    return BadRequest(response);
            //}

            return Ok(response);
        }
        [HttpPut("UpdateRegisterPropertyAsync")]
        public async Task<IActionResult> UpdateRegisterPropertyAsync([FromBody] PropertyBidderRegistrationDto dto)
        {
            if (dto.Id <= 0)
                return BadRequest("Invalid Property Id");

            var result = await _service.UpdateRegisterPropertyAsync(dto);

            if (!result.Success)
                return NotFound(result);

            return Ok(result);
        }
        [HttpGet("GetDistrictByHRMSUser")]
        public async Task<IActionResult> GetDistrictByHRMSUser()
        {
            var res = await _service.GetDistrictByHRMSUser(GetUserId());
            if (!res.Success)
            {
                return BadRequest(res);
            }
            return Ok(res);
        }

        [HttpGet("GetPendingForClerk")]
        public async Task<IActionResult> GetPendingForClerk([FromQuery] string? searchCode = null,int districtId =0, int branchId =0, int mandiid=0)
        {
            var response = await _service.GetPendingForClerk(GetUserId(),searchCode,districtId,branchId,mandiid);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpPost("VerifyByClerk")]
        public async Task<IActionResult> VerifyByClerk([FromBody] ClerkVerificationDto dto)
        {
            if (dto == null || dto.Id == 0)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = "Invalid request"
                });
            }

            var result = await _service.VerifyByClerk(dto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpGet("GetPropertyDistricts")]
        public async Task<IActionResult> GetPropertyDistricts()
        {
            var response = await _service.GetPropertyDistrictsAsync();

            return Ok(response);
        }

        [HttpGet("GetPropertyBranches/{districtId}")]
        public async Task<IActionResult> GetPropertyBranches(int districtId)
        {
            var response = await _service.GetPropertyBranchesAsync(districtId);

            return Ok(response);
        }

        [HttpGet("GetPropertyMandis/{branchId}")]
        public async Task<IActionResult> GetPropertyMandis(int branchId)
        {
            var response = await _service.GetPropertyMandisAsync(branchId);

            return Ok(response);
        }

        [HttpGet("GetPropertyPlotTypes/{mandiId}")]
        public async Task<IActionResult> GetPropertyPlotTypes(int mandiId)
        {
            var response = await _service.GetPropertyPlotTypesAsync(mandiId);

            return Ok(response);
        }

        [HttpGet("GetAuctionedPlots")]
        public async Task<IActionResult> GetAuctionedPlots( int mandiId, int plotTypeId)
        {
            var response = await _service.GetAuctionedPlotsAsync(mandiId, plotTypeId);
            return Ok(response);
        }

        [HttpGet("GetPropertyDetailsByMandiPlot")]
        public async Task<IActionResult> GetPropertyDetailsByMandiPlot(int MandiId, int PlotTypeId, string PlotNo, string PlotSize, [FromQuery] bool isSold = false)
        {
            var response = await _service.GetPropertyDetailsByMandiPlot(MandiId, PlotTypeId, PlotNo, PlotSize, isSold);

            return Ok(response);
        }

        [HttpGet("GetBiderPropertyDetailsByMandiPlotAsync")]
        public async Task<IActionResult> GetBiderPropertyDetailsByMandiPlotAsync(int MandiId, int PlotTypeId, string PlotNo, string PlotSize)
        {
            var response = await _service.GetBiderPropertyDetailsByMandiPlotAsync(MandiId, PlotTypeId, PlotNo, PlotSize);

            return Ok(response);
        }
        private string GetUserId() =>
           User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? throw new UnauthorizedAccessException("Invalid token");

        [HttpGet("GetPropertyMandiBrancheByDistrictIdAsync/{districtId}")]
        public async Task<IActionResult> GetPropertyMandiBrancheByDistrictIdAsync(int districtId)
        {
            var response = await _service.GetPropertyMandiBrancheByDistrictIdAsync(districtId);

            return Ok(response);
        }

        [HttpGet("GetPropertyMandisByBranchIdAsync/{branchId}")]
        public async Task<IActionResult> GetPropertyMandisByBranchIdAsync(int branchId)
        {
            var response = await _service.GetPropertyMandisByBranchIdAsync(branchId);

            return Ok(response);
        }

        [HttpGet("GetPropertyMandiPlotTypesAsync/{mandiId}")]
        public async Task<IActionResult> GetPropertyMandiPlotTypesAsync(int mandiId)
        {
            var response = await _service.GetPropertyMandiPlotTypesAsync(mandiId);

            return Ok(response);
        }

        [HttpGet("GetPlotsByPlotTypeAsync")]
        public async Task<IActionResult> GetPlotsByPlotTypeAsync(int mandiId, int plotTypeId)
        {
            var response = await _service.GetPlotsByPlotTypeAsync(mandiId, plotTypeId);
            return Ok(response);
        }

        [HttpGet("GetPlotSizebyPlotNo")]
        public async Task<IActionResult> GetPlotSizebyPlotNo([FromQuery] int mandiId, [FromQuery] int plotTypeId, [FromQuery] string plotNo)
        {
            try
            {
                var response = await _service.GetPlotSizebyPlotNo(mandiId, plotTypeId, plotNo);

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    ApiResponse<List<PlotSizeDto>>.Fail(
                        $"Error while fetching plot size: {ex.Message}"));
            }
        }
    }
}
