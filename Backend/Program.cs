using System;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Middleware;
using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Models.Settings;
using Backend.Repositories.Implementations;
using Backend.Repositories.Interfaces;
using Backend.Services.Implementations;
using Backend.Services.Interfaces;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

try
{
    Log.Information("Configuring services...");

    builder.Services.AddControllers()
      .ConfigureApiBehaviorOptions(options =>
      {
          options.InvalidModelStateResponseFactory = context =>
          {
              var errors = context.ModelState.Values
                  .SelectMany(v => v.Errors)
                  .Select(e => e.ErrorMessage)
                  .ToList();

              var response = new
              {
                  success = false,
                  message = "Validation failed",
                  errors = errors
              };

              return new BadRequestObjectResult(response);
          };
      });
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddFluentValidationClientsideAdapters();
    builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
    // ── DATABASE ──────────────────────────────────
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sql => sql.EnableRetryOnFailure(3)));

    builder.Services.AddIdentity<IdentityApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 8;

        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

    var jwtSettings = builder.Configuration.GetSection("JwtSettings");
    var secretKey = Encoding.UTF8.GetBytes(jwtSettings["Key"]
        ?? throw new InvalidOperationException("JwtSettings:Key missing"));

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = true;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(secretKey),
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync(
                    """{"success":false,"message":"Unauthorized. Please login first."}""");
            }
        };
    });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
        options.AddPolicy("UserOrAdmin", p => p.RequireRole("User", "Admin"));
    });

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("CorsPolicy", policy =>
        {
            policy.WithOrigins("http://localhost:4200", "https://dircolon.emandikaran-pb.in", "https://dircolon-pb.in")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    });

    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter(policyName: "FixedWindowLimit", limitOptions =>
        {
            limitOptions.PermitLimit = builder.Configuration.GetValue<int>("RateLimiting:PermitLimit");
            limitOptions.Window = TimeSpan.FromSeconds(builder.Configuration.GetValue<int>("RateLimiting:WindowInSeconds"));
            limitOptions.QueueLimit = builder.Configuration.GetValue<int>("RateLimiting:QueueLimit");
            limitOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        });

        options.AddFixedWindowLimiter(policyName: "AuthPolicy", limitOptions =>
        {
            limitOptions.PermitLimit = 5;
            limitOptions.Window = TimeSpan.FromMinutes(1);
            limitOptions.QueueLimit = 0;
        });

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });
    builder.Services.Configure<FileUploadSettings>(
    builder.Configuration.GetSection("FileUploadSettings"));
    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
    builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
    builder.Services.AddScoped<IPropertyBidderRegistration, Backend.Services.Implementations.PropertyBidderRegistration>(); builder.Services.AddScoped<ICommon, Common>();
    builder.Services.AddScoped<IUserPropertyRegistrationService,UserPropertyRegistrationService>();
    builder.Services.AddScoped<IReportService, ReportService>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IFileService, FileService>();
    builder.Services.AddMemoryCache();
    builder.Services.AddScoped<IEmailVerificationService, EmailVerificationService>();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddHttpClient();
    builder.Services.AddScoped<IMobileVerificationService, MobileVerificationService>();
    //
    builder.Services.AddScoped<ISendCredUserService, SendCredUserService>();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "PSAMB Colonization REST API",
            Version = "v1"
        });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization: Bearer {token}",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                        { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
    });
    var app = builder.Build();

    await SeedRolesAsync(app);

    if (!app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        try
        {
            await db.VerifyTdeAsync();
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "TDE Verification warning.");
        }
    }

    var enableSwagger = builder.Configuration.GetValue<bool>("EnableSwagger");

    if (enableSwagger)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
    }

    app.UseHttpsRedirection();

    app.UseRouting();

    app.UseCors("CorsPolicy");

    // app.UseRateLimiter();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();


    Log.Information("Host configured successfully. Running application...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}
async Task SeedRolesAsync(WebApplication app)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        string[] roles = { "Admin", "User" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Error seeding roles");
    }
}