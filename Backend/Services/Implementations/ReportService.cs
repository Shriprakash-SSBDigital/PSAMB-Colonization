using Azure;
using Backend.Data;
using Backend.Helpers;
using Backend.Models.DTOs;
using Backend.Services.Interfaces;
using ClosedXML.Excel;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NuGet.Packaging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using System.Data;
using System.Drawing;

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

        public async Task<ApiResponse<PagedResponse<ReportDto>>> GetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId, int pageNumber = 1,int pageSize = 10, DateTime? fromDate = null,  DateTime? toDate = null)
        {
            try
            {
                var result = new List<ReportDto>();
                var pagedResult = new PagedResponse<ReportDto>
                {
                    PageNumber = Math.Max(1, pageNumber),
                    PageSize = pageSize <= 0 ? 1000000 : pageSize
                };
                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetMandiWiseAllotmentSummary";
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@DistrictId", districtId));

                command.Parameters.Add(new SqlParameter("@BranchId", branchId));
                command.Parameters.Add(new SqlParameter("@MandiId", mandiId));
                command.Parameters.Add(new SqlParameter("@PageNumber", SqlDbType.Int){ Value = pagedResult.PageNumber});

                command.Parameters.Add( new SqlParameter("@PageSize", SqlDbType.Int) {  Value = pagedResult.PageSize});
                command.Parameters.Add( new SqlParameter("@FromDate", SqlDbType.Date){ Value = fromDate.HasValue ? fromDate.Value.Date : DBNull.Value });

                command.Parameters.Add( new SqlParameter("@ToDate", SqlDbType.Date) {  Value = toDate.HasValue ? toDate.Value.Date : DBNull.Value });

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter((SqlCommand)command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count == 0)
                {
                    return ApiResponse<PagedResponse<ReportDto>>.Fail(
                        "No allotment data found.");
                }

                DataTable table = dataSet.Tables[0];
                DataTable table1 = dataSet.Tables.Count > 1 ? dataSet.Tables[1] : null;

                int totalRecords = 0;
                if (table1 != null && table1.Rows.Count > 0)
                {
                    foreach (DataRow row in table1.Rows)
                    {
                        totalRecords = Convert.ToInt32(row["TotalRecords"]);
                    }
                }
                if (table.Rows.Count == 0)
                {
                    return ApiResponse<PagedResponse<ReportDto>>.Fail(
                        "No allotment data found.");
                }

               
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
                        AllotteeFatherName = row["AllotteeFatherName"] == DBNull.Value
                            ? null
                            : row["AllotteeFatherName"].ToString(),

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
                        AllotmentNumber = row["EstateNo"] == DBNull.Value
                            ? null
                            : row["EstateNo"].ToString(),
                    };

                    result.Add(item);
                }

                pagedResult.TotalRecords = totalRecords;
                pagedResult.TotalPages = (int)Math.Ceiling(
                    (double)totalRecords / pagedResult.PageSize);

                pagedResult.Data = result;
                return ApiResponse<PagedResponse<ReportDto>>.Ok(
                    pagedResult,
                    "Mandi wise allotment summary fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PagedResponse<ReportDto>>.Fail(
                    $"Error while fetching mandi wise allotment summary: {ex.Message}");
            }
        }

  
        public async Task<byte[]> ExportGetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            try
            {
                var response = await GetMandiWiseAllotmentSummaryAsync(districtId, branchId, mandiId, pageNumber: 1, pageSize: 1000000, fromDate, toDate);

                using var workbook = new XLWorkbook();

                var worksheet = workbook.Worksheets.Add(
                    "Mandi Wise Allotment Summary");

                // Excel Headers
                string[] headers =
                {"Allottee Code", "Allottee Name", "Father Name", "District Name","Branch Name","Mandi Name","Plot Type", "Plot No","Plot Size", "Auction Date", "Date Of Allotment", "Property ID", "Sales Amount","Estate No" };

                for (int col = 0; col < headers.Length; col++)
                {
                    worksheet.Cell(1, col + 1).Value = headers[col];
                }

                var headerRow = worksheet.Row(1);

                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.LightGray;
                headerRow.Style.Alignment.Horizontal =XLAlignmentHorizontalValues.Center;

                var records = response.Data?.Data ?? new List<ReportDto>();

                int row = 2;

                foreach (var item in records)
                {
                    worksheet.Cell(row, 1).Value = item.AllotteeCode ?? "";
                    worksheet.Cell(row, 2).Value = item.AllotteeName ?? "";
                    worksheet.Cell(row, 3).Value = item.AllotteeFatherName ?? "";
                    worksheet.Cell(row, 4).Value = item.DistrictName ?? "";
                    worksheet.Cell(row, 5).Value = item.BranchName ?? "";
                    worksheet.Cell(row, 6).Value = item.MandiName ?? "";
                    worksheet.Cell(row, 7).Value = item.PlotType ?? "";
                    worksheet.Cell(row, 8).Value = item.PlotNo ?? "";
                    worksheet.Cell(row, 9).Value = item.PlotSize ?? "";

                    if (item.AuctionDate.HasValue)
                    {
                        worksheet.Cell(row, 10).Value = item.AuctionDate.Value;
                        worksheet.Cell(row, 10).Style.DateFormat.Format =
                            "dd-MM-yyyy";
                    }

                    if (item.DateOfAllotment.HasValue)
                    {
                        worksheet.Cell(row, 11).Value = item.DateOfAllotment.Value;
                        worksheet.Cell(row, 11).Style.DateFormat.Format =
                            "dd-MM-yyyy";
                    }

                    worksheet.Cell(row, 12).Value = item.PropertyId;

                    if (item.FinalBidPrice.HasValue)
                    {
                        worksheet.Cell(row, 13).Value = item.FinalBidPrice.Value;
                        worksheet.Cell(row, 13).Style.NumberFormat.Format =
                            "#,##0.00";
                    }

                    worksheet.Cell(row, 14).Value = item.AllotmentNumber ?? "";

                    row++;
                }

                if (row > 2)
                {
                    worksheet.Range(1, 1, row - 1, headers.Length)
                        .Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

                    worksheet.Range(1, 1, row - 1, headers.Length)
                        .Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                }

                worksheet.SheetView.FreezeRows(1);

                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();

                workbook.SaveAs(stream);

                return stream.ToArray();
            }
            catch (Exception ex)
            {
                throw new Exception(
                    "Error while exporting Mandi Wise Allotment Summary to Excel.",
                    ex);
            }
        }



        public async Task<byte[]> ExportMandiWiseAllotmentSummaryPdfAsync(int? districtId, int? branchId, int? mandiId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var response = await GetMandiWiseAllotmentSummaryAsync(districtId ?? 0, branchId ?? 0, mandiId ?? 0, pageNumber: 1, pageSize: 1000000, fromDate: fromDate, toDate: toDate);

            if (response == null || !response.Success)
            {
                throw new InvalidOperationException(
                    response?.Message ?? "Unable to fetch allotment summary.");
            }

            var data = response.Data?.Data ?? new List<ReportDto>();

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var primaryColor = QuestPDF.Infrastructure.Color.FromHex("#136f48"); 
            var headerBgColor = QuestPDF.Infrastructure.Color.FromHex("#1b4332");
            var zebraBgColor = QuestPDF.Infrastructure.Color.FromHex("#f4f9f5"); 
            var borderColor = QuestPDF.Infrastructure.Color.FromHex("#d1d5db");

            // Generate PDF
            var document = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(QuestPDF.Helpers.PageSizes.A4.Landscape());
                    page.Margin(0.8f, QuestPDF.Infrastructure.Unit.Centimetre);
                    page.PageColor(QuestPDF.Helpers.Colors.White);

                    page.DefaultTextStyle(style => style.FontSize(7.5f));

                    // Header
                    page.Header().PaddingBottom(8).Column(headerCol =>
                    {
                        headerCol.Item().Row(row =>
                        {
                            row.RelativeItem().Column(titleCol =>
                            {
                                

                                titleCol.Item().Text("Mandi-Wise Allotment Summary Report")
                                    .SemiBold()
                                    .FontSize(10)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken3);
                            });

                            row.ConstantItem(240).AlignRight().Column(metaCol =>
                            {
                                metaCol.Item().Text($"Date: {DateTime.Now:dd-MMM-yyyy hh:mm tt}")
                                    .FontSize(8)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);

                                metaCol.Item().Text($"Total Records: {data.Count:N0}")
                                    .Bold()
                                    .FontSize(8.5f)
                                    .FontColor(primaryColor);
                            });
                        });

                        headerCol.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor(primaryColor);
                    });

                    // Content
                    page.Content()
                        .PaddingVertical(4)
                        .Column(column =>
                        {
                            if (data.Count == 0)
                            {
                                column.Item()
                                    .AlignCenter()
                                    .Padding(30)
                                    .Text("No allotment data found.")
                                    .FontSize(11)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            }
                            else
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(36);   
                                        columns.RelativeColumn(2.0f); 
                                        columns.RelativeColumn(2.6f); 
                                        columns.RelativeColumn(2.4f); 
                                        columns.RelativeColumn(1.8f); 
                                        columns.RelativeColumn(1.9f); 
                                        columns.RelativeColumn(2.1f);
                                        columns.RelativeColumn(1.8f);
                                        columns.RelativeColumn(1.2f); 
                                        columns.RelativeColumn(1.4f);
                                        columns.RelativeColumn(1.7f);
                                        columns.RelativeColumn(1.7f);
                                        columns.RelativeColumn(1.8f);
                                    });

                                    // Table header
                                    table.Header(header =>
                                    {
                                        void HeaderCell(string text, bool alignCenter = false, bool alignRight = false)
                                        {
                                            var cell = header.Cell()
                                                .Background(headerBgColor)
                                                .Border(0.5f)
                                                .BorderColor(headerBgColor)
                                                .Padding(4);

                                            if (alignCenter)
                                                cell.AlignCenter().Text(text).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else if (alignRight)
                                                cell.AlignRight().Text(text).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else
                                                cell.AlignLeft().Text(text).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                        }

                                        HeaderCell("Sr.", alignCenter: true);
                                        HeaderCell("Allottee Code");
                                        HeaderCell("Allottee Name");
                                        HeaderCell("Father Name");
                                        HeaderCell("District");
                                        HeaderCell("Branch");
                                        HeaderCell("Mandi");
                                        HeaderCell("Plot Type");
                                        HeaderCell("Plot No", alignCenter: true);
                                        HeaderCell("Size", alignCenter: true);
                                        HeaderCell("Auction Date", alignCenter: true);
                                        HeaderCell("Allotment Date", alignCenter: true);
                                        HeaderCell("Price", alignRight: true);
                                    });

                                    var srNo = 1;

                                    foreach (var item in data)
                                    {
                                        var isEven = (srNo % 2 == 0);
                                        var rowBg = isEven ? zebraBgColor : QuestPDF.Helpers.Colors.White;

                                        void DataCell(string? value, bool alignCenter = false, bool alignRight = false, bool bold = false)
                                        {
                                            var cell = table.Cell()
                                                .Background(rowBg)
                                                .BorderBottom(0.5f)
                                                .BorderColor(borderColor)
                                                .PaddingVertical(3)
                                                .PaddingHorizontal(3);

                                            if (alignCenter)
                                            {
                                                var t = cell.AlignCenter().Text(value ?? "").FontSize(7);
                                                if (bold) t.Bold();
                                            }
                                            else if (alignRight)
                                            {
                                                var t = cell.AlignRight().Text(value ?? "").FontSize(7);
                                                if (bold) t.Bold();
                                            }
                                            else
                                            {
                                                var t = cell.AlignLeft().Text(value ?? "").FontSize(7);
                                                if (bold) t.Bold();
                                            }
                                        }

                                        DataCell((srNo++).ToString(), alignCenter: true, bold: true);
                                        DataCell(item.AllotteeCode);
                                        DataCell(item.AllotteeName);
                                        DataCell(item.AllotteeFatherName);
                                        DataCell(item.DistrictName);
                                        DataCell(item.BranchName);
                                        DataCell(item.MandiName);
                                        DataCell(item.PlotType);
                                        DataCell(item.PlotNo, alignCenter: true);
                                        DataCell(item.PlotSize, alignCenter: true);
                                        DataCell(item.AuctionDate?.ToString("dd-MM-yyyy"), alignCenter: true);
                                        DataCell(item.DateOfAllotment?.ToString("dd-MM-yyyy"), alignCenter: true);
                                        DataCell(item.FinalBidPrice?.ToString("N2"), alignRight: true, bold: true);
                                    }
                                });
                            }
                        });

                    page.Footer()
                        .PaddingTop(6)
                        .Column(footerCol =>
                        {
                            footerCol.Item().LineHorizontal(0.5f).LineColor(QuestPDF.Helpers.Colors.Grey.Lighten1);
                            footerCol.Item().PaddingTop(4).Row(footerRow =>
                            {
                               
                                footerRow.RelativeItem().AlignCenter().Text(text =>
                                {
                                    text.Span("Page ").FontSize(7.5f);
                                    text.CurrentPageNumber().FontSize(7.5f).Bold();
                                    text.Span(" of ").FontSize(7.5f);
                                    text.TotalPages().FontSize(7.5f).Bold();
                                });

                              
                            });
                        });
                });
            });

            return document.GeneratePdf();
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
                        PlotTypeId = row["PlotTypeId"] == DBNull.Value ? 0 : Convert.ToInt32(row["PlotTypeId"]),
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

        public async Task<ApiResponse<List<PlotSoldUnsoldDto>>> GetPlotSoldUnsoldDetailsAsync(int districtId = 0, int branchId = 0)
        {
            try
            {
                var result = new List<PlotSoldUnsoldDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetPlotSoldUnsoldDetails";
                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.Add(new SqlParameter("@DistrictId", districtId));
                command.Parameters.Add(new SqlParameter("@BranchId", branchId));

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    result.Add(new PlotSoldUnsoldDto
                    {
                        SrNo = reader["SrNo"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["SrNo"]),

                        DistrictId = reader["DistrictId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["DistrictId"]),

                        DistrictName = reader["DistrictName"] == DBNull.Value
                            ? null
                            : reader["DistrictName"].ToString(),

                        BranchId = reader["BranchId"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["BranchId"]),

                        MarketCommittee = reader["MarketCommittee"] == DBNull.Value
                            ? null
                            : reader["MarketCommittee"].ToString(),

                        TotalPlots = reader["TotalPlots"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["TotalPlots"]),

                        SoldPlots = reader["SoldPlots"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["SoldPlots"]),

                        UnsoldPlots = reader["UnsoldPlots"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["UnsoldPlots"])
                    });
                }

                return ApiResponse<List<PlotSoldUnsoldDto>>.Ok(
                    result,"Plot details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlotSoldUnsoldDto>>.Fail(
                    $"Error fetching plot details: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<DigitizationPropertyDayWiseDto>>>  GetDigitizationPropertyDayWiseCountAsync(    DateTime fromDate, DateTime toDate)
        {
            try
            {
                if (fromDate.Date > toDate.Date)
                {
                    return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                        .Fail("From Date cannot be greater than To Date.");
                }

                var result = new List<DigitizationPropertyDayWiseDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetDigitizationPropertyDayWiseCount";
                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.Add(new SqlParameter("@FromDate", fromDate));
                command.Parameters.Add(new SqlParameter("@ToDate", toDate));

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    result.Add(new DigitizationPropertyDayWiseDto
                    {
                        CreatedDate = Convert.ToDateTime(
                            reader["CreatedDate"]),

                        Count = Convert.ToInt32(reader["Count"])
                    });
                }

                return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                    .Ok(result, "Day-wise property count fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                    .Fail($"Error fetching day-wise property count: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<DigitizationPropertyDayWiseDetailsDto>>> GetDigitizationPropertyDayWiseCountDetailsAsync(DateTime fromDate)
        {
            try
            {
                var result = new List<DigitizationPropertyDayWiseDetailsDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                // 1. Inspect definition and parameters of the stored procedure
                string? spDef = null;
                var paramNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    await using var checkCmd = connection.CreateCommand();
                    checkCmd.CommandText = @"
                        SELECT OBJECT_DEFINITION(OBJECT_ID('SP_GetDigitizationPropertyDayWiseCountDetails')) AS SpDef;
                        SELECT PARAMETER_NAME FROM INFORMATION_SCHEMA.PARAMETERS WHERE SPECIFIC_NAME = 'SP_GetDigitizationPropertyDayWiseCountDetails';
                    ";
                    await using var checkReader = await checkCmd.ExecuteReaderAsync();
                    if (await checkReader.ReadAsync())
                    {
                        spDef = checkReader[0] as string;
                    }
                    if (await checkReader.NextResultAsync())
                    {
                        while (await checkReader.ReadAsync())
                        {
                            paramNames.Add(checkReader.GetString(0));
                        }
                    }

                    if (!string.IsNullOrEmpty(spDef))
                    {
                        try { await File.WriteAllTextAsync(@"d:\Latest_Col_PSAMB\sp_debug.txt", spDef); } catch { }
                    }
                }
                catch { }

                await using var command = connection.CreateCommand();
                command.CommandText = "SP_GetDigitizationPropertyDayWiseCountDetails";
                command.CommandType = CommandType.StoredProcedure;
                command.CommandTimeout = 120;

                command.Parameters.Add(new SqlParameter("@FromDate", fromDate.Date));

                if (paramNames.Contains("@ToDate"))
                {
                    command.Parameters.Add(new SqlParameter("@ToDate", fromDate.Date.AddDays(1).AddSeconds(-1)));
                }

                await using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    result.Add(new DigitizationPropertyDayWiseDetailsDto
                    {
                        PropertyCode = reader["PropertyCode"] == DBNull.Value
                            ? null
                            : Convert.ToString(reader["PropertyCode"])
                    });
                }

                return ApiResponse<List<DigitizationPropertyDayWiseDetailsDto>>
                    .Ok(result, "Property details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<DigitizationPropertyDayWiseDetailsDto>>
                    .Fail($"Error fetching property details: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<MandiWiseAllotmentSummaryDto>>> GetAllMandisForMandiWiseAllotmentSummaryAsync(string? search)
        {
            var result = new List<MandiWiseAllotmentSummaryDto>();
            var connection = _context.Database.GetDbConnection();

            try
            {
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetAllMandisFormandiWiseAllottmentSummary";

                command.CommandType = CommandType.StoredProcedure;

                var searchParam = new SqlParameter("@search", SqlDbType.NVarChar, 100)
                {
                    Value = string.IsNullOrWhiteSpace(search)  ? DBNull.Value  : search.Trim()
                };

                command.Parameters.Add(searchParam);

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter((SqlCommand)command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count > 0)
                {
                    foreach (DataRow row in dataSet.Tables[0].Rows)
                    {
                        result.Add(new MandiWiseAllotmentSummaryDto
                        {
                            MandiId = Convert.ToInt32(row["MandiId"]),
                            MandiName = row["MandiName"] == DBNull.Value ? null : row["MandiName"].ToString(),
                            BranchId = Convert.ToInt32(row["BranchId"]),
                            DistrictId = Convert.ToInt32(row["DistrictId"])
                        });
                    }
                }

                return ApiResponse<List<MandiWiseAllotmentSummaryDto>>.Ok(result, "Mandis fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<MandiWiseAllotmentSummaryDto>>.Fail($"Error fetching mandis: {ex.Message}");
            }
          
        }

    }
}
