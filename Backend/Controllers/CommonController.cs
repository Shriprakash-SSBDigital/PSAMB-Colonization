using Backend.Models.DTOs;
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
    public class CommonController : ControllerBase
    {
        private readonly ICommon _common;

        public CommonController(ICommon common)
        {
            _common = common;
        }
         


        [HttpGet("getAllStates")]
        public async Task<IActionResult> GetAllStates()
        {
            var response = await _common.GetAllStates();

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }

        [HttpGet("getAllDistrict")]
        public async Task<IActionResult> GetAllDistrict(int stateid)
        {
            try
            {
                var result = await _common.GetAllDistrictsAsync(stateid);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("GetAllCityByDistrictID")]
        public async Task<IActionResult> GetAllCityByDistrictID(int districtid)
        {
            try
            {
                var result = await _common.GetAllCityByDistrictID(districtid);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("getMarketCommittees")]
        public async Task<IActionResult> GetMarketCommittees(int? districtId)
        {
            var response = await _common.GetMarketCommitteesAsync(districtId);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("GetMandisByMarketCommiteeByDistrictAsync")]
        public async Task<IActionResult> GetMandisByMarketCommiteeByDistrictAsync(int branchID)
        {
            var response = await _common.GetMandisByMarketCommiteeByDistrictAsync(branchID);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getPlotTypes")]
        public async Task<IActionResult> GetPlotTypes(int? propertyTypeId)
        {
            var response = await _common.GetPlotTypesAsync(propertyTypeId);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getPlotSizes")]
        public async Task<IActionResult> GetPlotSizes()
        {
            var response = await _common.GetPlotSizesAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getPlans")]
        public async Task<IActionResult> GetPlans()
        {
            var response = await _common.GetPlansAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getPropertyTypes")]
        public async Task<IActionResult> GetPropertyTypes()
        {
            var response = await _common.GetPropertyTypesAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getBidderTypes")]
        public async Task<IActionResult> GetBidderTypes()
        {
            var response = await _common.GetBidderTypesAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getApplicationStatuses")]
        public async Task<IActionResult> GetApplicationStatuses()
        {
            var response = await _common.GetApplicationStatusesAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("getPropertyCategories")]
        public async Task<IActionResult> GetPropertyCategories()
        {
            var response = await _common.GetPropertyCategoriesAsync();
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("GetPlotTypesByMandiId")]
        public async Task<IActionResult> GetPlotTypesByMandiId(int mandiId)
        {
            var response = await _common.GetPlotTypesByMandiIdAsync(mandiId);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("GetPlotNoByPlotTypeID")]
        public async Task<IActionResult> GetPlotNoByPlotTypeID(int ploytypeid)
        {
            var response = await _common.GetPlotNoByPlotTypeID(ploytypeid);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("GetPlotSizeByPlotNo")]
        public async Task<IActionResult> GetPlotSizeByPlotNo(int plotNo)
        {
            var response = await _common.GetPlotSizeByPlotNo(plotNo);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpGet("GetPropertyDetailsByPlot")]
        public async Task<IActionResult> GetPropertyDetailsByPlot(int? mandiId, int? plotTypeId, int? plotNo, string? plotSize)
        {
            var response = await _common.GetPropertyDetailsByPlot(mandiId, plotTypeId, plotNo, plotSize);
            return Ok(response);
        }

        [HttpGet("getProfileDetailsByUserId")]
        public async Task<IActionResult> GetProfileDetailsByUserId()
        {
            var Userid = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(Userid))
            {
                return BadRequest(new { success = false, message = "userId is required." });
            }

            var response = await _common.GetProfileDetailsByUserId(Userid);

            if (!response.Success)
            {
                return NotFound(response);
            }

            return Ok(response);
        }
        [HttpGet("GetProfileImageByUserId")]
        public async Task<IActionResult> GetProfileImageByUserId()
        {
            var Userid = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(Userid))
            {
                return BadRequest(new { success = false, message = "userId is required." });
            }

            var response = await _common.GetProfileImageByUserIdAsync(Userid);

            if (!response.Success)
            {
                return NotFound(response);
            }

            return Ok(response);
        }

        [HttpPost("SaveProfileChanges")]
        public async Task<IActionResult> SaveProfileChanges([FromBody] UpdateUserProfileDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new { success = false, message = "User ID is required." });
            }

            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Profile data is required." });
            }

            var response = await _common.SaveProfileChangesAsync(userId, dto);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
    }
}
