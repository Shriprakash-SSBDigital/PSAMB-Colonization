using Azure;
using Backend.Data;
using Backend.Helpers;
using Backend.Models.DTOs;
using Backend.Services.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Services.Implementations
{
    public class ReportService:IReportService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        public ReportService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<ApiResponse<List<ReportDto>>>GetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId)
        {
            try
            {
                var result = new List<ReportDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetMandiWiseAllotmentSummary";
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@DistrictId", districtId));

                command.Parameters.Add(new SqlParameter("@BranchId", branchId));
                command.Parameters.Add(new SqlParameter("@MandiId", mandiId));

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter((SqlCommand)command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count == 0 ||
                    dataSet.Tables[0].Rows.Count == 0)
                {
                    return ApiResponse<List<ReportDto>>.Ok(
                        result,
                        "No allotment data found.");
                }

                DataTable table = dataSet.Tables[0];

                foreach (DataRow row in table.Rows)
                {
                    var item = new ReportDto
                    {

                        AllotteeCode = row["AllotteeCode"] == DBNull.Value
                            ? null
                            : row["AllotteeCode"].ToString(),

                        AllotteeName = row["AllotteeName"] == DBNull.Value
                            ? null
                            : row["AllotteeName"].ToString(),

                        PropertyAllotteeId = row["PropertyAllotteeId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["PropertyAllotteeId"]),

                        DistrictName = row["DistrictName"] == DBNull.Value
                            ? null
                            : row["DistrictName"].ToString(),

                        MandiName = row["MandiName"] == DBNull.Value
                            ? null
                            : row["MandiName"].ToString(),

                        BranchName = row["BranchName"] == DBNull.Value
                            ? null
                            : row["BranchName"].ToString(),

                        PlotTypeId = row["PlotTypeId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["PlotTypeId"]),

                        PlotType = row["PlotType"] == DBNull.Value
                            ? null
                            : row["PlotType"].ToString(),

                        PlotNo = row["PlotNo"] == DBNull.Value
                            ? null
                            : row["PlotNo"].ToString(),

                        PlotSize = row["PlotSize"] == DBNull.Value
                            ? null
                            : row["PlotSize"].ToString(),

                        AuctionDate = row["AuctionDate"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(row["AuctionDate"]),

                        DateOfAllotment = row["DateOfAllotment"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(row["DateOfAllotment"]),

                        PropertyId = row["PropertyId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["PropertyId"]),

                        BranchId = row["BranchId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["BranchId"]),

                        MandiId = row["MandiId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["MandiId"]),

                        DistrictId = row["DistrictId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(row["DistrictId"]),

                        FinalBidPrice =row["SalesAmount"] != DBNull.Value
                            ? Convert.ToDecimal(row["SalesAmount"])
                            : null,
                    };

                    result.Add(item);
                }

                return ApiResponse<List<ReportDto>>.Ok(
                    result,
                    "Mandi wise allotment summary fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<ReportDto>>.Fail(
                    $"Error while fetching mandi wise allotment summary: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<MandiForPropertyReportDto>>> GetMandisForPropertyReportAsync()
        {
            try
            {
                var result = new List<MandiForPropertyReportDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "GetMandisForPropertyReport";
                command.CommandType = CommandType.StoredProcedure;

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter((SqlCommand)command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count == 0 || dataSet.Tables[0].Rows.Count == 0)
                {
                    return ApiResponse<List<MandiForPropertyReportDto>>.Ok(
                        result,
                        "No mandis found for property report.");
                }

                DataTable table = dataSet.Tables[0];

                foreach (DataRow row in table.Rows)
                {
                    var item = new MandiForPropertyReportDto
                    {
                        MandiId = row["MandiId"] == DBNull.Value ? 0 : Convert.ToInt64(row["MandiId"]),
                        MandiName = row["MandiName"] == DBNull.Value ? null : row["MandiName"].ToString(),
                        DistrictId = row["DistrictId"] == DBNull.Value ? 0 : Convert.ToInt32(row["DistrictId"])
                    };

                    result.Add(item);
                }

                return ApiResponse<List<MandiForPropertyReportDto>>.Ok(
                    result,
                    "Mandis fetched successfully for property report.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MandiForPropertyReportDto>>.Fail(
                    $"Error while fetching mandis for property report: {ex.Message}");
            }
        }
        public async Task<ApiResponse<List<PlotWiseConsolidateDetailsDto>>> GetPlotWiseConsolidateDetailsAsync(long mandiId)
        {
            try
            {
                var result = new List<PlotWiseConsolidateDetailsDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "GetPlotWiseConsolidateDetails";
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@MandiId", mandiId));

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter((SqlCommand)command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count == 0 || dataSet.Tables[0].Rows.Count == 0)
                {
                    return ApiResponse<List<PlotWiseConsolidateDetailsDto>>.Ok(
                        result,
                        "No plot consolidate details found.");
                }

                DataTable table = dataSet.Tables[0];

                foreach (DataRow row in table.Rows)
                {
                    var item = new PlotWiseConsolidateDetailsDto
                    {
                        PlotType = row["PlotType"] == DBNull.Value ? null : row["PlotType"].ToString(),
                        PlotSize = row["PlotSize"] == DBNull.Value ? null : row["PlotSize"].ToString(),
                        TotalPlots = row["TotalPlots"] == DBNull.Value ? 0 : Convert.ToInt32(row["TotalPlots"]),
                        TotalSoldPlots = row["TotalSoldPlots"] == DBNull.Value ? 0 : Convert.ToInt32(row["TotalSoldPlots"]),
                        TotalUnsoldPlots = row["TotalUnsoldPlots"] == DBNull.Value ? 0 : Convert.ToInt32(row["TotalUnsoldPlots"]),
                        AllPlots = row["AllPlots"] == DBNull.Value ? null : row["AllPlots"].ToString(),
                        SoldPlots = row["SoldPlots"] == DBNull.Value ? null : row["SoldPlots"].ToString(),
                        UnsoldPlots = row["UnsoldPlots"] == DBNull.Value ? null : row["UnsoldPlots"].ToString()
                    };

                    result.Add(item);
                }

                return ApiResponse<List<PlotWiseConsolidateDetailsDto>>.Ok(
                    result,
                    "Plot wise consolidate details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotWiseConsolidateDetailsDto>>.Fail(
                    $"Error while fetching plot wise consolidate details: {ex.Message}");
            }
        }

       
    }
}
