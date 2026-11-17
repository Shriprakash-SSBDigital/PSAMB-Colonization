using Backend.Models.DTOs;

namespace Backend.Services.Interfaces



{
    public interface IDashboardService
    {
        Task<DashboardDtos> GetPropertySummaryAsync();
    }
}
