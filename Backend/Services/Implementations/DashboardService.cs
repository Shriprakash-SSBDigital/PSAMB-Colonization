using Backend.Data;
using Backend.Models.DTOs;
using Backend.Services.Interfaces;
using DocumentFormat.OpenXml.InkML;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Services.Implementations

{
    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        public DashboardService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<DashboardDtos> GetPropertySummaryAsync()
        {
            return (await _cache.GetOrCreateAsync("dashboard_property_summary", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);   

                var rows = await _context.Database
                    .SqlQueryRaw<DashboardDtos>("EXEC dbo.SP_GetDashboardPropertySummary")
                    .ToListAsync();

                return rows.FirstOrDefault() ?? new DashboardDtos();
            }))!;
        }
    }
}
    
