using Backend.Helpers;
using Backend.Models.Dtos;
using Backend.Models.DTOs;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserPropertyRegistrationController : ControllerBase
    {
        private readonly IUserPropertyRegistrationService _service;

        public UserPropertyRegistrationController(IUserPropertyRegistrationService service)
        {
            _service = service;
        }

        [HttpPost("UserPropertyRegistration")]
        public async Task<IActionResult> UserPropertyRegistrationAsync([FromBody] UserPropertyRegistrationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _service.UserPropertyRegisterAsync(dto);
            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }

        [HttpGet("GetMandiPlotSizeByPlotNo")]
        public async Task<IActionResult> GetMandiPlotSizeByPlotNo([FromQuery] int mandiId, [FromQuery] int plotTypeId, [FromQuery] string plotNo)
        {
            try
            {
                var response = await _service.GetMandiPlotSizeByPlotNoAsync(mandiId,plotTypeId,plotNo);

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

        private string GetUserId() =>
           User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? throw new UnauthorizedAccessException("Invalid token");

        [HttpGet("GetPropertyOwnerVerification")]
        public async Task<IActionResult> GetPropertyOwnerVerification([FromQuery] string? searchCode = null, int districtId = 0, int branchId = 0, int mandiid = 0)
        {
            var response = await _service.GetPropertyOwnerVerificationAsync(GetUserId(), searchCode, districtId, branchId, mandiid);

            return Ok(response);
        }

        [HttpPost("VerifyByClerkForUser")]
        public async Task<IActionResult> VerifyByClerkForUser([FromBody] ClerkVerificationDto dto)
        {
            if (dto == null || dto.Id == 0)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = "Invalid request"
                });
            }

            var result = await _service.VerifyByClerkForUser(dto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// User ke View button click par — createdBy (ApplicantId) ke base par
        /// us user ke saare PropertyDocuments (with file path) return karta hai.
        /// </summary>
        [HttpGet("GetUserDocumentsByUserIDAsync")]
        public async Task<IActionResult> GetUserDocumentsByUserIDAsync(int applicantID)
        {
            if (applicantID <= 0)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = "Invalid user details."
                });
            }

            var result = await _service.GetUserDocumentsByUserIDAsync(applicantID);
            return Ok(result);
        }

        [HttpGet("GetAllUserRegisterPropertyById")]
        public async Task<IActionResult> GetAllUserRegisterPropertyById()
        {
            var response = await _service.GetAllUserRegisterPropertyById(GetUserId());
            if (!response.Success)
            {
                return NotFound(response);
            }

            return Ok(response);
        }

    }
}
