using Backend.Data;
using Backend.Helpers;
using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Services.Implementations;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using LoginRequest = Backend.Models.DTOs.LoginRequest;
using RegisterRequest = Backend.Models.DTOs.RegisterRequest;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IMemoryCache _cache;
        private readonly ApplicationDbContext _context;
        private readonly UserManager<IdentityApplicationUser> _userManager;
        private readonly IMobileVerificationService _mobileService;
        private readonly ISendCredUserService _sendCredUserService;
        public AuthController(IAuthService authService, IMemoryCache cache,
            ApplicationDbContext context,
            UserManager<IdentityApplicationUser> userManager,
            IMobileVerificationService smsService, ISendCredUserService sendCredUserService)
        {
            _authService = authService;
            _cache = cache;
            _context = context;
            _userManager = userManager;
            _mobileService = smsService;
            _sendCredUserService = sendCredUserService;
        }

        [HttpPost("register")]
        [EnableRateLimiting("AuthPolicy")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> Register(
            [FromBody] RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(ApiResponse<LoginResponse>.Ok(result, "Registration successful"));
        }

        [HttpPost("login")]
        [EnableRateLimiting("AuthPolicy")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.firtLogin(request);
            return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful"));
        }
        [HttpPost("change-first-login-password")]
        [Authorize]
        public async Task<ActionResult<ApiResponse>> ChangeFirstLoginPassword([FromBody] FirstLoginChangePasswordRequest request)
        {
            var userId = GetUserId();
            await _authService.ChangeFirstLoginPasswordAsync(userId, request);
            return Ok(ApiResponse.Ok("Password changed successfully"));
        }


        //[HttpPost("login")]
        //[EnableRateLimiting("AuthPolicy")]
        //public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        //    [FromBody] LoginRequest request)
        //{
        //    var result = await _authService.LoginAsync(request);
        //    return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful"));
        //}


        [HttpGet("profile")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<UserResponse>>> GetProfile()
        {
            var result = await _authService.GetProfileAsync(GetUserId());
            return Ok(ApiResponse<UserProfileWithMenuResponse>.Ok(result));
        }


        [HttpPut("UpdateProfile")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateProfile(
            [FromBody] UpdateProfileRequest request)
        {
            var result = await _authService.UpdateProfileAsync(GetUserId(), request);
            return Ok(ApiResponse<UserResponse>.Ok(result, "Profile updated"));
        }
        [HttpPost("change-password")]
        public async Task<ActionResult<ApiResponse>> ChangePassword(
            [FromBody] ChangePasswordRequest request)
        {
            await _authService.ChangePasswordAsync(request);
            return Ok(ApiResponse.Ok("Password changed successfully"));
        }

        [HttpPost("send-login-otp")]
        [EnableRateLimiting("AuthPolicy")]
        public async Task<ActionResult<ApiResponse>> SendLoginOtp([FromBody] SendMobileOtpRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.MobileNumber) ||
                    request.MobileNumber.Length != 10)
                    return BadRequest(ApiResponse.Fail("Invalid mobile number"));

                var applicant = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(x => x.MobileNo == request.MobileNumber
                        && x.IsDeleted == false
                        && x.IsActive == true);

                if (applicant == null)
                    return BadRequest(ApiResponse.Fail("Mobile number not registered"));

                var otp = new Random().Next(100000, 999999).ToString();

                _cache.Set($"login_otp_{request.MobileNumber}", otp, TimeSpan.FromMinutes(5));

                var message = "Your OTP for login on IMS Portal is: " + otp + " -PSAMB";
                await _mobileService.SendSmsAsync(
               request.MobileNumber, message, otp, 0);

                return Ok(ApiResponse.Ok("OTP sent successfully"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.Fail(ex.Message));
            }
        }

        [HttpPost("login-with-otp")]
       [EnableRateLimiting("AuthPolicy")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> LoginWithOtp(
            [FromBody] MobileOtpLoginRequest request)
        {
            try
            {
                var cachedOtp = _cache.Get<string>($"login_otp_{request.MobileNumber}");

                if (cachedOtp == null || cachedOtp != request.Otp)
                    return BadRequest(ApiResponse<LoginResponse>.Fail("Invalid or expired OTP"));

                _cache.Remove($"login_otp_{request.MobileNumber}");

                var dbOtp = await _context.MobileOTPs
                    .Where(x => x.MobileNumber == request.MobileNumber
                        && x.OTP == request.Otp
                        && x.IsUsed == false)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync();

                if (dbOtp != null)
                {
                    dbOtp.IsUsed = true;
                    await _context.SaveChangesAsync();
                }

                var applicant = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(x => x.MobileNo == request.MobileNumber
                        && x.IsDeleted == false
                        && x.IsActive == true);

                if (applicant == null)
                    return BadRequest(ApiResponse<LoginResponse>.Fail("User not found"));

                var result = await _authService.GenerateTokenForUser(applicant);
                return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<LoginResponse>.Fail(ex.Message));
            }
        }
        [HttpPost("test-send-credentials")]
        public async Task<ActionResult<ApiResponse>> TestSendCredentials(
    [FromBody] SendCredModel model)
        {
            try
            {
                var result = await _sendCredUserService.SendCredentialsAsync(model);

                if (!result)
                    return BadRequest(ApiResponse.Fail("Failed to send credentials"));

                return Ok(ApiResponse.Ok("Credentials sent successfully"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.Fail(ex.Message));
            }
        }
        private string GetUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Invalid token");
    }
}
