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

  
 

        private static readonly Dictionary<string, MandiWiseReportColumnDef> MandiWiseColumnsMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["srNo"] = new MandiWiseReportColumnDef
            {
                Key = "srNo",
                Header = "Sr. No.",
                PdfWeight = 0.8f,
                AlignCenter = true,
                Bold = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = sr;
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                },
                GetPdfText = (dto, sr) => sr.ToString()
            },
            ["alloteeCode"] = new MandiWiseReportColumnDef
            {
                Key = "alloteeCode",
                Header = "Allotee Code",
                PdfWeight = 2.0f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.AllotteeCode ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.AllotteeCode ?? ""
            },
            ["name"] = new MandiWiseReportColumnDef
            {
                Key = "name",
                Header = "Allotee Name",
                PdfWeight = 2.4f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.AllotteeName ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.AllotteeName ?? ""
            },
            ["district"] = new MandiWiseReportColumnDef
            {
                Key = "district",
                Header = "District",
                PdfWeight = 1.8f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.DistrictName ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.DistrictName ?? ""
            },
            ["branchName"] = new MandiWiseReportColumnDef
            {
                Key = "branchName",
                Header = "Market Committee",
                PdfWeight = 2.0f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.BranchName ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.BranchName ?? ""
            },
            ["mandi"] = new MandiWiseReportColumnDef
            {
                Key = "mandi",
                Header = "Mandi",
                PdfWeight = 2.0f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.MandiName ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.MandiName ?? ""
            },
            ["plotType"] = new MandiWiseReportColumnDef
            {
                Key = "plotType",
                Header = "Plot Type",
                PdfWeight = 1.6f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.PlotType ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.PlotType ?? ""
            },
            ["plotNo"] = new MandiWiseReportColumnDef
            {
                Key = "plotNo",
                Header = "Plot No.",
                PdfWeight = 1.2f,
                AlignCenter = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.PlotNo ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                },
                GetPdfText = (dto, sr) => dto.PlotNo ?? ""
            },
            ["plotSize"] = new MandiWiseReportColumnDef
            {
                Key = "plotSize",
                Header = "Plot Size",
                PdfWeight = 1.4f,
                AlignCenter = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.PlotSize ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                },
                GetPdfText = (dto, sr) => dto.PlotSize ?? ""
            },
            ["auctionDate"] = new MandiWiseReportColumnDef
            {
                Key = "auctionDate",
                Header = "Auction Date",
                PdfWeight = 1.6f,
                AlignCenter = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    if (dto.AuctionDate.HasValue)
                    {
                        cell.Value = dto.AuctionDate.Value;
                        cell.Style.DateFormat.Format = "dd-MM-yyyy";
                    }
                    else
                    {
                        cell.Value = "";
                    }
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                },
                GetPdfText = (dto, sr) => dto.AuctionDate?.ToString("dd-MM-yyyy") ?? ""
            },
            ["allotmentDate"] = new MandiWiseReportColumnDef
            {
                Key = "allotmentDate",
                Header = "Allotment Date",
                PdfWeight = 1.6f,
                AlignCenter = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    if (dto.DateOfAllotment.HasValue)
                    {
                        cell.Value = dto.DateOfAllotment.Value;
                        cell.Style.DateFormat.Format = "dd-MM-yyyy";
                    }
                    else
                    {
                        cell.Value = "";
                    }
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                },
                GetPdfText = (dto, sr) => dto.DateOfAllotment?.ToString("dd-MM-yyyy") ?? ""
            },
            ["allotmentNo"] = new MandiWiseReportColumnDef
            {
                Key = "allotmentNo",
                Header = "Allotment No.",
                PdfWeight = 1.8f,
                SetExcelCell = (cell, dto, sr) =>
                {
                    cell.Value = dto.AllotmentNumber ?? "";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                },
                GetPdfText = (dto, sr) => dto.AllotmentNumber ?? ""
            },
            ["allotmentPrice"] = new MandiWiseReportColumnDef
            {
                Key = "allotmentPrice",
                Header = "Allotment Price",
                PdfWeight = 1.8f,
                AlignRight = true,
                Bold = true,
                SetExcelCell = (cell, dto, sr) =>
                {
                    if (dto.FinalBidPrice.HasValue)
                    {
                        cell.Value = dto.FinalBidPrice.Value;
                        cell.Style.NumberFormat.Format = "#,##0.00";
                    }
                    else
                    {
                        cell.Value = "";
                    }
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                },
                GetPdfText = (dto, sr) => dto.FinalBidPrice?.ToString("N2") ?? ""
            }
        };

        private static List<MandiWiseReportColumnDef> ResolveMandiWiseColumns(string? columns)
        {
            var defaultKeys = new[]
            {
                "srNo", "alloteeCode", "name", "district", "branchName", "mandi",
                "plotType", "plotNo", "plotSize", "auctionDate", "allotmentDate", "allotmentNo", "allotmentPrice"
            };

            if (string.IsNullOrWhiteSpace(columns))
            {
                return defaultKeys.Select(k => MandiWiseColumnsMap[k]).ToList();
            }

            var requestedKeys = columns.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var list = new List<MandiWiseReportColumnDef>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var rawKey in requestedKeys)
            {
                var key = rawKey.Trim();
                if (MandiWiseColumnsMap.TryGetValue(key, out var colDef) && seen.Add(colDef.Key))
                {
                    list.Add(colDef);
                }
            }

            return list.Count > 0 ? list : defaultKeys.Select(k => MandiWiseColumnsMap[k]).ToList();
        }

        public async Task<byte[]> ExportGetMandiWiseAllotmentSummaryAsync(int districtId, int branchId, int mandiId, DateTime? fromDate = null, DateTime? toDate = null, string? columns = null)
        {
            try
            {
                var response = await GetMandiWiseAllotmentSummaryAsync(districtId, branchId, mandiId, pageNumber: 1, pageSize: 1000000, fromDate, toDate);

                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Mandi Wise Allotment Summary");

                var selectedColumns = ResolveMandiWiseColumns(columns);

                for (int col = 0; col < selectedColumns.Count; col++)
                {
                    worksheet.Cell(1, col + 1).Value = selectedColumns[col].Header;
                }

                var headerRow = worksheet.Row(1);
                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.LightGray;
                headerRow.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var records = response.Data?.Data ?? new List<ReportDto>();

                int row = 2;
                int srNo = 1;

                foreach (var item in records)
                {
                    for (int col = 0; col < selectedColumns.Count; col++)
                    {
                        var cell = worksheet.Cell(row, col + 1);
                        selectedColumns[col].SetExcelCell(cell, item, srNo);
                    }
                    row++;
                    srNo++;
                }

                int totalDataRows = row - 2;
                int endRow = totalDataRows > 0 ? row - 1 : 1;

                worksheet.Range(1, 1, endRow, selectedColumns.Count)
                    .Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                worksheet.Range(1, 1, endRow, selectedColumns.Count)
                    .Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                worksheet.SheetView.FreezeRows(1);
                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return stream.ToArray();
            }
            catch (Exception ex)
            {
                throw new Exception("Error while exporting Mandi Wise Allotment Summary to Excel.", ex);
            }
        }

        public async Task<byte[]> ExportMandiWiseAllotmentSummaryPdfAsync(int? districtId, int? branchId, int? mandiId, DateTime? fromDate = null, DateTime? toDate = null, string? columns = null)
        {
            var response = await GetMandiWiseAllotmentSummaryAsync(districtId ?? 0, branchId ?? 0, mandiId ?? 0, pageNumber: 1, pageSize: 1000000, fromDate: fromDate, toDate: toDate);

            if (response == null || !response.Success)
            {
                throw new InvalidOperationException(
                    response?.Message ?? "Unable to fetch allotment summary.");
            }

            var data = response.Data?.Data ?? new List<ReportDto>();
            var selectedColumns = ResolveMandiWiseColumns(columns);

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var primaryColor = QuestPDF.Infrastructure.Color.FromHex("#136f48"); 
            var headerBgColor = QuestPDF.Infrastructure.Color.FromHex("#1b4332");
            var zebraBgColor = QuestPDF.Infrastructure.Color.FromHex("#f8fafc"); 
            var gridBorderColor = QuestPDF.Infrastructure.Color.FromHex("#cbd5e1");

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
                                    table.ColumnsDefinition(cols =>
                                    {
                                        foreach (var col in selectedColumns)
                                        {
                                            if (col.Key == "srNo")
                                                cols.ConstantColumn(30);
                                            else
                                                cols.RelativeColumn(col.PdfWeight);
                                        }
                                    });

                                    // Table header
                                    table.Header(header =>
                                    {
                                        foreach (var col in selectedColumns)
                                        {
                                            var cell = header.Cell()
                                                .Background(headerBgColor)
                                                .Border(0.5f)
                                                .BorderColor(QuestPDF.Infrastructure.Color.FromHex("#143d2b"))
                                                .PaddingVertical(4)
                                                .PaddingHorizontal(3);

                                            if (col.AlignCenter)
                                                cell.AlignCenter().Text(col.Header).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else if (col.AlignRight)
                                                cell.AlignRight().Text(col.Header).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else
                                                cell.AlignLeft().Text(col.Header).Bold().FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                        }
                                    });

                                    var srNo = 1;

                                    foreach (var item in data)
                                    {
                                        var isEven = (srNo % 2 == 0);
                                        var rowBg = isEven ? zebraBgColor : QuestPDF.Helpers.Colors.White;

                                        foreach (var col in selectedColumns)
                                        {
                                            var cell = table.Cell()
                                                .ShowEntire()
                                                .Background(rowBg)
                                                .Border(0.5f)
                                                .BorderColor(gridBorderColor)
                                                .PaddingVertical(3f)
                                                .PaddingHorizontal(3.5f);

                                            string val = col.GetPdfText(item, srNo);

                                            if (col.AlignCenter)
                                            {
                                                var t = cell.AlignCenter().Text(val).FontSize(7f);
                                                if (col.Bold) t.Bold();
                                            }
                                            else if (col.AlignRight)
                                            {
                                                var t = cell.AlignRight().Text(val).FontSize(7f);
                                                if (col.Bold) t.Bold();
                                            }
                                            else
                                            {
                                                var t = cell.AlignLeft().Text(val).FontSize(7f);
                                                if (col.Bold) t.Bold();
                                            }
                                        }
                                        srNo++;
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
                                footerRow.RelativeItem().Text("PSAMB - Mandi Wise Allotment Summary").FontSize(7f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                                footerRow.RelativeItem().AlignCenter().Text(text =>
                                {
                                    text.Span("Page ").FontSize(7.5f);
                                    text.CurrentPageNumber().FontSize(7.5f).Bold();
                                    text.Span(" of ").FontSize(7.5f);
                                    text.TotalPages().FontSize(7.5f).Bold();
                                });
                                footerRow.RelativeItem().AlignRight().Text($"{DateTime.Now:dd-MMM-yyyy}").FontSize(7f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
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
        public async Task<ApiResponse<PagedResponse<PlotWiseConsolidateDetailsDto>>> GetPlotWiseConsolidateDetailsAsync(long mandiId, int pageNumber = 1, int pageSize = 10)
        {
            try
            {
                var pagedResult = new PagedResponse<PlotWiseConsolidateDetailsDto>
                {
                    PageNumber = Math.Max(1, pageNumber),
                    PageSize = pageSize <= 0 ? 10 : pageSize
                };

                var result = new List<PlotWiseConsolidateDetailsDto>();

                var connectionString = _context.Database.GetConnectionString() ?? _config.GetConnectionString("DefaultConnection");
                await using var connection = new SqlConnection(connectionString);

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = new SqlCommand("GetPlotWiseConsolidateDetails", connection);
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@MandiId", mandiId));
                command.Parameters.Add(new SqlParameter("@PageNumber", SqlDbType.Int) { Value = pagedResult.PageNumber });
                command.Parameters.Add(new SqlParameter("@PageSize", SqlDbType.Int) { Value = pagedResult.PageSize });

                var dataSet = new DataSet();

                using (var adapter = new SqlDataAdapter(command))
                {
                    adapter.Fill(dataSet);
                }

                if (dataSet.Tables.Count == 0 || dataSet.Tables[0].Rows.Count == 0)
                {
                    return ApiResponse<PagedResponse<PlotWiseConsolidateDetailsDto>>.Ok(
                        pagedResult,
                        "No plot consolidate details found.");
                }

                DataTable table = dataSet.Tables[0];

                int totalRecords = 0;
                int mandiTotalPlots = 0;
                int mandiTotalSoldPlots = 0;
                int mandiTotalUnsoldPlots = 0;

                if (table.Rows.Count > 0)
                {
                    if (table.Columns.Contains("TotalRecords") && table.Rows[0]["TotalRecords"] != DBNull.Value)
                        totalRecords = Convert.ToInt32(table.Rows[0]["TotalRecords"]);
                    else
                        totalRecords = table.Rows.Count;

                    if (table.Columns.Contains("MandiTotalPlots") && table.Rows[0]["MandiTotalPlots"] != DBNull.Value)
                        mandiTotalPlots = Convert.ToInt32(table.Rows[0]["MandiTotalPlots"]);

                    if (table.Columns.Contains("MandiTotalSoldPlots") && table.Rows[0]["MandiTotalSoldPlots"] != DBNull.Value)
                        mandiTotalSoldPlots = Convert.ToInt32(table.Rows[0]["MandiTotalSoldPlots"]);

                    if (table.Columns.Contains("MandiTotalUnsoldPlots") && table.Rows[0]["MandiTotalUnsoldPlots"] != DBNull.Value)
                        mandiTotalUnsoldPlots = Convert.ToInt32(table.Rows[0]["MandiTotalUnsoldPlots"]);
                }

                pagedResult.TotalRecords = totalRecords;
                pagedResult.TotalPages = (int)Math.Ceiling((double)totalRecords / pagedResult.PageSize);
                pagedResult.MandiTotalPlots = mandiTotalPlots;
                pagedResult.MandiTotalSoldPlots = mandiTotalSoldPlots;
                pagedResult.MandiTotalUnsoldPlots = mandiTotalUnsoldPlots;

                foreach (DataRow row in table.Rows)
                {
                    var item = new PlotWiseConsolidateDetailsDto
                    {
                        PlotTypeId = table.Columns.Contains("PlotTypeId") && row["PlotTypeId"] != DBNull.Value ? Convert.ToInt32(row["PlotTypeId"]) : 0,
                        PlotType = table.Columns.Contains("PlotType") && row["PlotType"] != DBNull.Value ? row["PlotType"].ToString() : null,
                        PlotSize = table.Columns.Contains("PlotSize") && row["PlotSize"] != DBNull.Value ? row["PlotSize"].ToString() : null,
                        TotalPlots = table.Columns.Contains("TotalPlots") && row["TotalPlots"] != DBNull.Value ? Convert.ToInt32(row["TotalPlots"]) : 0,
                        TotalSoldPlots = table.Columns.Contains("TotalSoldPlots") && row["TotalSoldPlots"] != DBNull.Value ? Convert.ToInt32(row["TotalSoldPlots"]) : 0,
                        TotalUnsoldPlots = table.Columns.Contains("TotalUnsoldPlots") && row["TotalUnsoldPlots"] != DBNull.Value ? Convert.ToInt32(row["TotalUnsoldPlots"]) : 0,
                        AllPlots = table.Columns.Contains("AllPlots") && row["AllPlots"] != DBNull.Value ? row["AllPlots"].ToString() : null,
                        SoldPlots = table.Columns.Contains("SoldPlots") && row["SoldPlots"] != DBNull.Value ? row["SoldPlots"].ToString() : null,
                        UnsoldPlots = table.Columns.Contains("UnsoldPlots") && row["UnsoldPlots"] != DBNull.Value ? row["UnsoldPlots"].ToString() : null,
                        TotalRecords = totalRecords,
                        MandiTotalPlots = mandiTotalPlots,
                        MandiTotalSoldPlots = mandiTotalSoldPlots,
                        MandiTotalUnsoldPlots = mandiTotalUnsoldPlots
                    };

                    result.Add(item);
                }

                pagedResult.Data = result;

                return ApiResponse<PagedResponse<PlotWiseConsolidateDetailsDto>>.Ok(
                    pagedResult,
                    "Plot wise consolidate details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PagedResponse<PlotWiseConsolidateDetailsDto>>.Fail(
                    $"Error while fetching plot wise consolidate details: {ex.Message}");
            }
        }

        public async Task<byte[]> ExportPlotWiseConsolidateDetailsAsync(long mandiId)
        {
            try
            {
                var mandiName = await _context.MandiMaster
                    .Where(x => x.MandiId == mandiId)
                    .Select(x => x.MandiName)
                    .FirstOrDefaultAsync() ?? $"Mandi_{mandiId}";

                var response = await GetPlotWiseConsolidateDetailsAsync(mandiId, pageNumber: 1, pageSize: 1000000);

                var records = response.Data?.Data ?? new List<PlotWiseConsolidateDetailsDto>();

                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Plot Consolidate Details");

                // Title row
                worksheet.Cell(1, 1).Value = $"{mandiName}";
                worksheet.Range(1, 1, 1, 7).Merge();
                worksheet.Row(1).Style.Font.Bold = true;
                worksheet.Row(1).Style.Font.FontSize = 14;
                worksheet.Row(1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                worksheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F5E9");

                // Headers
                string[] headers = { "Sr. No.", "Plot Type", "Plot Size", "Total Plots", "All Plots", "Sold Plots", "Unsold Plots" };

                for (int col = 0; col < headers.Length; col++)
                {
                    worksheet.Cell(3, col + 1).Value = headers[col];
                }

                var headerRow = worksheet.Row(3);
                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#1B4332");
                headerRow.Style.Font.FontColor = XLColor.White;
                headerRow.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                int row = 4;
                int srNo = 1;
                foreach (var item in records)
                {
                    worksheet.Cell(row, 1).Value = srNo++;
                    worksheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    worksheet.Cell(row, 2).Value = item.PlotType ?? "";
                    worksheet.Cell(row, 3).Value = item.PlotSize ?? "";
                    worksheet.Cell(row, 4).Value = item.TotalPlots;
                    worksheet.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    worksheet.Cell(row, 5).Value = item.AllPlots ?? "-";
                    worksheet.Cell(row, 6).Value = item.SoldPlots ?? "-";
                    worksheet.Cell(row, 7).Value = item.UnsoldPlots ?? "-";

                    row++;
                }

                // Summary Row
                int totalPlotsSum = response.Data?.MandiTotalPlots ?? records.Sum(r => r.TotalPlots);
                int totalSoldPlotsSum = response.Data?.MandiTotalSoldPlots ?? records.Sum(r => r.TotalSoldPlots);
                int totalUnsoldPlotsSum = response.Data?.MandiTotalUnsoldPlots ?? records.Sum(r => r.TotalUnsoldPlots);

                worksheet.Cell(row, 1).Value = "";
                worksheet.Cell(row, 2).Value = "";
                worksheet.Cell(row, 3).Value = "Total";
                worksheet.Cell(row, 3).Style.Font.Bold = true;
                worksheet.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                worksheet.Cell(row, 4).Value = totalPlotsSum;
                worksheet.Cell(row, 4).Style.Font.Bold = true;
                worksheet.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                worksheet.Cell(row, 5).Value = "";

                worksheet.Cell(row, 6).Value = totalSoldPlotsSum;
                worksheet.Cell(row, 6).Style.Font.Bold = true;
                worksheet.Cell(row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                worksheet.Cell(row, 7).Value = totalUnsoldPlotsSum;
                worksheet.Cell(row, 7).Style.Font.Bold = true;
                worksheet.Cell(row, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var totalRow = worksheet.Row(row);
                totalRow.Style.Fill.BackgroundColor = XLColor.LightGray;

                worksheet.Range(3, 1, row, 7).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                worksheet.Range(3, 1, row, 7).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return stream.ToArray();
            }
            catch (Exception ex)
            {
                throw new Exception("Error while exporting Plot Wise Consolidate Details to Excel.", ex);
            }
        }

        public async Task<byte[]> ExportPlotWiseConsolidateDetailsPdfAsync(long mandiId)
        {
            var mandiName = await _context.MandiMaster
                .Where(x => x.MandiId == mandiId)
                .Select(x => x.MandiName)
                .FirstOrDefaultAsync() ?? $"Mandi {mandiId}";

            var response = await GetPlotWiseConsolidateDetailsAsync(mandiId, pageNumber: 1, pageSize: 1000000);

            if (response == null || !response.Success)
            {
                throw new InvalidOperationException(
                    response?.Message ?? "Unable to fetch plot consolidate details.");
            }

            var data = response.Data?.Data ?? new List<PlotWiseConsolidateDetailsDto>();

            int mandiTotalPlots = response.Data?.MandiTotalPlots ?? data.Sum(r => r.TotalPlots);
            int mandiTotalSoldPlots = response.Data?.MandiTotalSoldPlots ?? data.Sum(r => r.TotalSoldPlots);
            int mandiTotalUnsoldPlots = response.Data?.MandiTotalUnsoldPlots ?? data.Sum(r => r.TotalUnsoldPlots);

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var primaryColor = QuestPDF.Infrastructure.Color.FromHex("#136f48");
            var headerBgColor = QuestPDF.Infrastructure.Color.FromHex("#1b4332");
            var zebraBgColor = QuestPDF.Infrastructure.Color.FromHex("#f4f9f5");
            var borderColor = QuestPDF.Infrastructure.Color.FromHex("#d1d5db");

            var document = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(QuestPDF.Helpers.PageSizes.A4.Landscape());
                    page.Margin(0.8f, QuestPDF.Infrastructure.Unit.Centimetre);
                    page.PageColor(QuestPDF.Helpers.Colors.White);

                    page.DefaultTextStyle(style => style.FontSize(8f));

                    // Header
                    page.Header().PaddingBottom(8).Column(headerCol =>
                    {
                        headerCol.Item().Row(row =>
                        {
                            row.RelativeItem().Column(titleCol =>
                            {
                                titleCol.Item().Text($"{mandiName}")
                                    .Bold()
                                    .FontSize(12)
                                    .FontColor(primaryColor);

                                titleCol.Item().Text($"Summary: Total Plots: {mandiTotalPlots}  |  Sold Plots: {mandiTotalSoldPlots}  |  Unsold Plots: {mandiTotalUnsoldPlots}")
                                    .FontSize(8.5f)
                                    .SemiBold()
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken2);
                            });

                            row.ConstantItem(200).AlignRight().Column(metaCol =>
                            {
                                metaCol.Item().Text($"Date: {DateTime.Now:dd-MMM-yyyy hh:mm tt}")
                                    .FontSize(8)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);

                                
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
                                    .Text("No plot details found.")
                                    .FontSize(11)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            }
                            else
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(35);   // Sr.
                                        columns.RelativeColumn(2.0f); // Plot Type
                                        columns.RelativeColumn(1.8f); // Plot Size
                                        columns.RelativeColumn(1.2f); // Total Plots
                                        columns.RelativeColumn(4.5f); // All Plots
                                        columns.RelativeColumn(4.5f); // Sold Plots
                                        columns.RelativeColumn(3.0f); // Unsold Plots
                                    });

                                    // Table header
                                    table.Header(header =>
                                    {
                                        void HeaderCell(string text, bool alignCenter = false)
                                        {
                                            var cell = header.Cell()
                                                .Background(headerBgColor)
                                                .Border(0.5f)
                                                .BorderColor(headerBgColor)
                                                .Padding(4);

                                            if (alignCenter)
                                                cell.AlignCenter().Text(text).Bold().FontSize(8f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else
                                                cell.AlignLeft().Text(text).Bold().FontSize(8f).FontColor(QuestPDF.Helpers.Colors.White);
                                        }

                                        HeaderCell("Sr.", alignCenter: true);
                                        HeaderCell("Plot Type");
                                        HeaderCell("Plot Size");
                                        HeaderCell("Total", alignCenter: true);
                                        HeaderCell("All Plots");
                                        HeaderCell("Sold Plots");
                                        HeaderCell("Unsold Plots");
                                    });

                                    var srNo = 1;

                                    foreach (var item in data)
                                    {
                                        var isEven = (srNo % 2 == 0);
                                        var rowBg = isEven ? zebraBgColor : QuestPDF.Helpers.Colors.White;

                                        void DataCell(string? value, bool alignCenter = false, bool isSold = false, bool isUnsold = false)
                                        {
                                            var cell = table.Cell()
                                                .Background(rowBg)
                                                .BorderBottom(0.5f)
                                                .BorderColor(borderColor)
                                                .Padding(3);

                                            var display = string.IsNullOrWhiteSpace(value) ? "-" : value;

                                            if (alignCenter)
                                            {
                                                cell.AlignCenter().Text(display).FontSize(7.5f);
                                            }
                                            else if (isSold)
                                            {
                                                cell.AlignLeft().Text(display).FontSize(7.5f).FontColor(QuestPDF.Infrastructure.Color.FromHex("#15803d"));
                                            }
                                            else if (isUnsold)
                                            {
                                                cell.AlignLeft().Text(display).FontSize(7.5f).FontColor(QuestPDF.Infrastructure.Color.FromHex("#b91c1c"));
                                            }
                                            else
                                            {
                                                cell.AlignLeft().Text(display).FontSize(7.5f);
                                            }
                                        }

                                        DataCell(srNo.ToString(), alignCenter: true);
                                        DataCell(item.PlotType);
                                        DataCell(item.PlotSize);
                                        DataCell(item.TotalPlots.ToString(), alignCenter: true);
                                        DataCell(item.AllPlots);
                                        DataCell(item.SoldPlots, isSold: true);
                                        DataCell(item.UnsoldPlots, isUnsold: true);

                                        srNo++;
                                    }

                                    // Table Total Row
                                    void TotalCell(string text, bool alignCenter = false, bool alignRight = false)
                                    {
                                        var cell = table.Cell()
                                            .Background(QuestPDF.Helpers.Colors.Grey.Lighten3)
                                            .BorderTop(1f)
                                            .BorderColor(primaryColor)
                                            .Padding(4);

                                        if (alignCenter)
                                            cell.AlignCenter().Text(text).Bold().FontSize(8f);
                                        else if (alignRight)
                                            cell.AlignRight().Text(text).Bold().FontSize(8f);
                                        else
                                            cell.AlignLeft().Text(text).Bold().FontSize(8f);
                                    }

                                    //TotalCell("");
                                    //TotalCell("");
                                    //TotalCell("Total:", alignRight: true);
                                    //TotalCell(mandiTotalPlots.ToString(), alignCenter: true);
                                    //TotalCell("");
                                    //TotalCell($"Sold: {mandiTotalSoldPlots}");
                                    //TotalCell($"Unsold: {mandiTotalUnsoldPlots}");
                                });
                            }
                        });

                    // Footer
                    page.Footer()
                        .PaddingTop(6)
                        .Column(footerCol =>
                        {
                            footerCol.Item().LineHorizontal(0.5f).LineColor(QuestPDF.Helpers.Colors.Grey.Lighten1);
                            footerCol.Item().PaddingTop(4).Row(footerRow =>
                            {
                                footerRow.RelativeItem().Text("PSAMB - Colonization Management").FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                                footerRow.RelativeItem().AlignCenter().Text(text =>
                                {
                                    text.Span("Page ").FontSize(7.5f);
                                    text.CurrentPageNumber().FontSize(7.5f).Bold();
                                    text.Span(" of ").FontSize(7.5f);
                                    text.TotalPages().FontSize(7.5f).Bold();
                                });
                                footerRow.RelativeItem().AlignRight().Text($"{DateTime.Now:yyyy-MM-dd}").FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            });
                        });
                });
            });

            return document.GeneratePdf();
        }

        public async Task<ApiResponse<PagedResponse<PlotSoldUnsoldDto>>> GetPlotSoldUnsoldDetailsAsync(int districtId = 0, int branchId = 0, int pageNumber = 1, int pageSize = 10)
        {
            try
            {
                var pagedResult = new PagedResponse<PlotSoldUnsoldDto>
                {
                    PageNumber = Math.Max(1, pageNumber),
                    PageSize = pageSize <= 0 ? 10 : pageSize
                };

                var result = new List<PlotSoldUnsoldDto>();

                await using var connection = _context.Database.GetDbConnection();

                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();

                command.CommandText = "SP_GetPlotSoldUnsoldDetails";
                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.Add(new SqlParameter("@DistrictId", districtId));
                command.Parameters.Add(new SqlParameter("@BranchId", branchId));
                command.Parameters.Add(new SqlParameter("@PageNumber", pagedResult.PageNumber));
                command.Parameters.Add(new SqlParameter("@PageSize", pagedResult.PageSize));

                await using var reader = await command.ExecuteReaderAsync();

                int totalRecords = 0;
                int overallTotalPlots = 0;
                int overallSoldPlots = 0;
                int overallUnsoldPlots = 0;

                bool hasTotalRecords = false;
                bool hasOverallTotalPlots = false;
                bool hasOverallSoldPlots = false;
                bool hasOverallUnsoldPlots = false;

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var colName = reader.GetName(i);
                    if (string.Equals(colName, "TotalRecords", StringComparison.OrdinalIgnoreCase)) hasTotalRecords = true;
                    else if (string.Equals(colName, "OverallTotalPlots", StringComparison.OrdinalIgnoreCase)) hasOverallTotalPlots = true;
                    else if (string.Equals(colName, "OverallSoldPlots", StringComparison.OrdinalIgnoreCase)) hasOverallSoldPlots = true;
                    else if (string.Equals(colName, "OverallUnsoldPlots", StringComparison.OrdinalIgnoreCase)) hasOverallUnsoldPlots = true;
                }

                while (await reader.ReadAsync())
                {
                    if (hasTotalRecords && reader["TotalRecords"] != DBNull.Value)
                        totalRecords = Convert.ToInt32(reader["TotalRecords"]);

                    if (hasOverallTotalPlots && reader["OverallTotalPlots"] != DBNull.Value)
                        overallTotalPlots = Convert.ToInt32(reader["OverallTotalPlots"]);

                    if (hasOverallSoldPlots && reader["OverallSoldPlots"] != DBNull.Value)
                        overallSoldPlots = Convert.ToInt32(reader["OverallSoldPlots"]);

                    if (hasOverallUnsoldPlots && reader["OverallUnsoldPlots"] != DBNull.Value)
                        overallUnsoldPlots = Convert.ToInt32(reader["OverallUnsoldPlots"]);

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
                            : Convert.ToInt32(reader["UnsoldPlots"]),

                        TotalRecords = totalRecords
                    });
                }

                await reader.CloseAsync();

                if (!hasTotalRecords)
                {
                    try
                    {
                        await using var countCmd = connection.CreateCommand();
                        countCmd.CommandText = @"
                            SELECT COUNT(*) FROM (
                                SELECT PRM.BranchId
                                FROM PropertyRegistrationMaster PRM
                                INNER JOIN BranchMaster BM ON BM.BranchId = PRM.BranchId
                                WHERE PRM.IsDeleted = 0 AND PRM.IsActive = 1
                                    AND (@DistrictId = 0 OR BM.DistrictId = @DistrictId)
                                    AND (@BranchId = 0 OR PRM.BranchId = @BranchId)
                                GROUP BY BM.DistrictId, PRM.BranchId
                            ) AS t";
                        countCmd.Parameters.Add(new SqlParameter("@DistrictId", districtId));
                        countCmd.Parameters.Add(new SqlParameter("@BranchId", branchId));

                        var countObj = await countCmd.ExecuteScalarAsync();
                        if (countObj != null && countObj != DBNull.Value)
                        {
                            totalRecords = Convert.ToInt32(countObj);
                        }
                        else
                        {
                            totalRecords = result.Count;
                        }
                    }
                    catch
                    {
                        totalRecords = result.Count;
                    }
                }

                if (!hasOverallTotalPlots || !hasOverallSoldPlots || !hasOverallUnsoldPlots)
                {
                    try
                    {
                        await using var sumCmd = connection.CreateCommand();
                        sumCmd.CommandText = @"
                            SELECT 
                                COUNT(PRM.PropertyId) AS OverallTotalPlots,
                                SUM(CASE WHEN ISNULL(PRM.Propertystatus, 0) = 1 THEN 1 ELSE 0 END) AS OverallSoldPlots,
                                SUM(CASE WHEN ISNULL(PRM.Propertystatus, 0) = 0 THEN 1 ELSE 0 END) AS OverallUnsoldPlots
                            FROM PropertyRegistrationMaster PRM
                            INNER JOIN BranchMaster BM ON BM.BranchId = PRM.BranchId
                            WHERE PRM.IsDeleted = 0 AND PRM.IsActive = 1
                                AND (@DistrictId = 0 OR BM.DistrictId = @DistrictId)
                                AND (@BranchId = 0 OR PRM.BranchId = @BranchId)";
                        sumCmd.Parameters.Add(new SqlParameter("@DistrictId", districtId));
                        sumCmd.Parameters.Add(new SqlParameter("@BranchId", branchId));

                        await using var sumReader = await sumCmd.ExecuteReaderAsync();
                        if (await sumReader.ReadAsync())
                        {
                            if (!hasOverallTotalPlots && sumReader["OverallTotalPlots"] != DBNull.Value)
                                overallTotalPlots = Convert.ToInt32(sumReader["OverallTotalPlots"]);
                            if (!hasOverallSoldPlots && sumReader["OverallSoldPlots"] != DBNull.Value)
                                overallSoldPlots = Convert.ToInt32(sumReader["OverallSoldPlots"]);
                            if (!hasOverallUnsoldPlots && sumReader["OverallUnsoldPlots"] != DBNull.Value)
                                overallUnsoldPlots = Convert.ToInt32(sumReader["OverallUnsoldPlots"]);
                        }
                    }
                    catch
                    {
                        if (!hasOverallTotalPlots) overallTotalPlots = result.Sum(x => x.TotalPlots);
                        if (!hasOverallSoldPlots) overallSoldPlots = result.Sum(x => x.SoldPlots);
                        if (!hasOverallUnsoldPlots) overallUnsoldPlots = result.Sum(x => x.UnsoldPlots);
                    }
                }

                pagedResult.Data = result;
                pagedResult.TotalRecords = totalRecords;
                pagedResult.TotalPages = (int)Math.Ceiling((double)totalRecords / pagedResult.PageSize);
                pagedResult.OverallTotalPlots = overallTotalPlots;
                pagedResult.OverallSoldPlots = overallSoldPlots;
                pagedResult.OverallUnsoldPlots = overallUnsoldPlots;

                return ApiResponse<PagedResponse<PlotSoldUnsoldDto>>.Ok(
                    pagedResult, "Plot details fetched successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PagedResponse<PlotSoldUnsoldDto>>.Fail(
                    $"Error fetching plot details: {ex.Message}");
            }
        }

        public async Task<byte[]> ExportPlotSoldUnsoldDetailsAsync(int districtId = 0, int branchId = 0)
        {
            try
            {
                var response = await GetPlotSoldUnsoldDetailsAsync(districtId, branchId, pageNumber: 1, pageSize: 1000000);

                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Plot Sold Unsold Details");


                worksheet.Cell(1, 1).Value = "Plot Sold/Unsold Details Report";
                worksheet.Range(1, 1, 1, 6).Merge();
                worksheet.Row(1).Style.Font.Bold = true;
                worksheet.Row(1).Style.Font.FontSize = 13;
                worksheet.Row(2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                worksheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F5E9");


                // Headers
                string[] headers = { "Sr. No.", "District", "Market Committee", "Total Plots", "Sold Plots", "Unsold Plots" };

                for (int col = 0; col < headers.Length; col++)
                {
                    worksheet.Cell(4, col + 1).Value = headers[col];
                }

                var headerRow = worksheet.Row(4);
                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#1B4332");
                headerRow.Style.Font.FontColor = XLColor.White;
                headerRow.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var records = response.Data?.Data ?? new List<PlotSoldUnsoldDto>();
                int row = 5;
                int srNo = 1;

                foreach (var item in records)
                {
                    worksheet.Cell(row, 1).Value = srNo++;
                    worksheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    worksheet.Cell(row, 2).Value = item.DistrictName ?? "";
                    worksheet.Cell(row, 3).Value = item.MarketCommittee ?? "";

                    worksheet.Cell(row, 4).Value = item.TotalPlots;
                    worksheet.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    worksheet.Cell(row, 5).Value = item.SoldPlots;
                    worksheet.Cell(row, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    worksheet.Cell(row, 6).Value = item.UnsoldPlots;
                    worksheet.Cell(row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    row++;
                }

                // Summary Row
                int totalPlotsSum = response.Data?.OverallTotalPlots ?? records.Sum(r => r.TotalPlots);
                int totalSoldSum = response.Data?.OverallSoldPlots ?? records.Sum(r => r.SoldPlots);
                int totalUnsoldSum = response.Data?.OverallUnsoldPlots ?? records.Sum(r => r.UnsoldPlots);

                worksheet.Cell(row, 1).Value = "";
                worksheet.Cell(row, 2).Value = "";
                worksheet.Cell(row, 3).Value = "Total";
                worksheet.Cell(row, 3).Style.Font.Bold = true;
                worksheet.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                worksheet.Cell(row, 4).Value = totalPlotsSum;
                worksheet.Cell(row, 4).Style.Font.Bold = true;
                worksheet.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                worksheet.Cell(row, 5).Value = totalSoldSum;
                worksheet.Cell(row, 5).Style.Font.Bold = true;
                worksheet.Cell(row, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                worksheet.Cell(row, 6).Value = totalUnsoldSum;
                worksheet.Cell(row, 6).Style.Font.Bold = true;
                worksheet.Cell(row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                var totalRow = worksheet.Row(row);
                totalRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#F4F9F5");

                worksheet.Range(4, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                worksheet.Range(4, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return stream.ToArray();
            }
            catch (Exception ex)
            {
                throw new Exception("Error while exporting Plot Sold/Unsold Details to Excel.", ex);
            }
        }

        public async Task<byte[]> ExportPlotSoldUnsoldDetailsPdfAsync(int districtId = 0, int branchId = 0)
        {
            var response = await GetPlotSoldUnsoldDetailsAsync(districtId, branchId, pageNumber: 1, pageSize: 1000000);

            if (response == null || !response.Success)
            {
                throw new InvalidOperationException(response?.Message ?? "Unable to fetch plot details.");
            }

            var data = response.Data?.Data ?? new List<PlotSoldUnsoldDto>();

            int overallTotalPlots = response.Data?.OverallTotalPlots ?? data.Sum(r => r.TotalPlots);
            int overallSoldPlots = response.Data?.OverallSoldPlots ?? data.Sum(r => r.SoldPlots);
            int overallUnsoldPlots = response.Data?.OverallUnsoldPlots ?? data.Sum(r => r.UnsoldPlots);

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var primaryColor = QuestPDF.Infrastructure.Color.FromHex("#136f48");
            var headerBgColor = QuestPDF.Infrastructure.Color.FromHex("#1b4332");
            var zebraBgColor = QuestPDF.Infrastructure.Color.FromHex("#f4f9f5");
            var borderColor = QuestPDF.Infrastructure.Color.FromHex("#d1d5db");

            var document = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(QuestPDF.Helpers.PageSizes.A4.Portrait());
                    page.Margin(1.0f, QuestPDF.Infrastructure.Unit.Centimetre);
                    page.PageColor(QuestPDF.Helpers.Colors.White);

                    page.DefaultTextStyle(style => style.FontSize(9f));

                    // Header
                    page.Header().PaddingBottom(6).Column(headerCol =>
                    {
                        headerCol.Item().Row(row =>
                        {
                            row.RelativeItem().Column(titleCol =>
                            {
                                titleCol.Item().Text("Plot Sold/Unsold Details Report")
                                    .Bold()
                                    .FontSize(12f)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken4);
                            });

                            row.ConstantItem(180).AlignRight().Column(metaCol =>
                            {
                                metaCol.Item().Text($"Date: {DateTime.Now:dd-MMM-yyyy hh:mm tt}")
                                    .FontSize(8)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            });
                        });

                        headerCol.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor(primaryColor);
                    });

                    // Content
                    page.Content()
                        .PaddingVertical(4)
                        .Column(column =>
                        {
                            // Show Summary ONLY on first page, with smaller font
                            column.Item().PaddingBottom(6).Text($"Summary: Total: {overallTotalPlots:N0}  |  Sold: {overallSoldPlots:N0}  |  Unsold: {overallUnsoldPlots:N0}")
                                .FontSize(8f)
                                .SemiBold()
                                .FontColor(QuestPDF.Helpers.Colors.Grey.Darken2);

                            if (data.Count == 0)
                            {
                                column.Item()
                                    .AlignCenter()
                                    .Padding(30)
                                    .Text("No plot details found.")
                                    .FontSize(11)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            }
                            else
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(32);   // Sr. No
                                        columns.RelativeColumn(3.8f); // District
                                        columns.RelativeColumn(3.4f); // Market Committee
                                        columns.RelativeColumn(1.4f); // Total Plots
                                        columns.RelativeColumn(1.4f); // Sold Plots
                                        columns.RelativeColumn(1.4f); // Unsold Plots
                                    });

                                    var gridBorderColor = QuestPDF.Infrastructure.Color.FromHex("#cbd5e1");

                                    // Table header
                                    table.Header(header =>
                                    {
                                        void HeaderCell(string text, bool alignRight = false, bool alignCenter = false)
                                        {
                                            var cell = header.Cell()
                                                .Background(headerBgColor)
                                                .Border(0.5f)
                                                .BorderColor(QuestPDF.Infrastructure.Color.FromHex("#0f291e"))
                                                .Padding(5);

                                            if (alignCenter)
                                                cell.AlignCenter().Text(text).Bold().FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else if (alignRight)
                                                cell.AlignRight().Text(text).Bold().FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else
                                                cell.AlignLeft().Text(text).Bold().FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.White);
                                        }

                                        HeaderCell("Sr.", alignCenter: true);
                                        HeaderCell("District");
                                        HeaderCell("Market Committee");
                                        HeaderCell("Total Plots", alignRight: true);
                                        HeaderCell("Sold Plots", alignRight: true);
                                        HeaderCell("Unsold Plots", alignRight: true);
                                    });

                                    int srNo = 1;
                                    foreach (var item in data)
                                    {
                                        var isEven = (srNo % 2 == 0);
                                        var rowBg = isEven ? QuestPDF.Infrastructure.Color.FromHex("#f8fafc") : QuestPDF.Helpers.Colors.White;

                                        void DataCell(string? value, bool alignRight = false, bool alignCenter = false, bool isBold = false)
                                        {
                                            var cell = table.Cell()
                                                .Background(rowBg)
                                                .Border(0.5f)
                                                .BorderColor(gridBorderColor)
                                                .PaddingVertical(3.5f)
                                                .PaddingHorizontal(5);

                                            if (alignCenter)
                                            {
                                                var t = cell.AlignCenter().Text(value ?? "").FontSize(8);
                                                if (isBold) t.Bold();
                                            }
                                            else if (alignRight)
                                            {
                                                var t = cell.AlignRight().Text(value ?? "").FontSize(8);
                                                if (isBold) t.Bold();
                                            }
                                            else
                                            {
                                                var t = cell.AlignLeft().Text(value ?? "").FontSize(8);
                                                if (isBold) t.Bold();
                                            }
                                        }

                                        DataCell(srNo.ToString(), alignCenter: true);
                                        DataCell(item.DistrictName ?? "");
                                        DataCell(item.MarketCommittee ?? "");
                                        DataCell(item.TotalPlots.ToString("N0"), alignRight: true, isBold: true);
                                        DataCell(item.SoldPlots.ToString("N0"), alignRight: true);
                                        DataCell(item.UnsoldPlots.ToString("N0"), alignRight: true);

                                        srNo++;
                                    }

                                    // Summary / Total Row
                                    table.Cell().ColumnSpan(3)
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(gridBorderColor)
                                        .Padding(5)
                                        .AlignRight()
                                        .Text("Total")
                                        .Bold()
                                        .FontSize(8.5f)
                                        .FontColor(primaryColor);

                                    table.Cell()
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(gridBorderColor)
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(overallTotalPlots.ToString("N0"))
                                        .Bold()
                                        .FontSize(8.5f)
                                        .FontColor(primaryColor);

                                    table.Cell()
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(gridBorderColor)
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(overallSoldPlots.ToString("N0"))
                                        .Bold()
                                        .FontSize(8.5f)
                                        .FontColor(QuestPDF.Infrastructure.Color.FromHex("#198754"));

                                    table.Cell()
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(gridBorderColor)
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(overallUnsoldPlots.ToString("N0"))
                                        .Bold()
                                        .FontSize(8.5f)
                                        .FontColor(QuestPDF.Infrastructure.Color.FromHex("#dc3545"));
                                });
                            }
                        });

                    // Footer
                    page.Footer().PaddingTop(4).Column(footerCol =>
                    {
                        footerCol.Item().LineHorizontal(0.5f).LineColor(borderColor);
                        footerCol.Item().PaddingTop(2).Row(row =>
                        {
                          

                            row.RelativeItem().AlignRight().Text(text =>
                            {
                                text.Span("Page ").FontSize(7).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                                text.CurrentPageNumber().FontSize(7.5f).Bold();
                                text.Span(" of ").FontSize(7).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                                text.TotalPages().FontSize(7.5f).Bold();
                            });
                        });
                    });
                });
            });

            return document.GeneratePdf();
        }

        public async Task<ApiResponse<List<DigitizationPropertyDayWiseDto>>>  GetDigitizationPropertyDayWiseCountAsync(DateTime fromDate, DateTime toDate, int pageNumber = 1,int pageSize = 10)
        {
            try
            {
                if (fromDate.Date > toDate.Date)
                {
                    return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                        .Fail("From Date cannot be greater than To Date.");
                }
                if (pageNumber < 1)
                {
                    return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                        .Fail("Page number must be greater than 0.");
                }

                if (pageSize < 1)
                {
                    return ApiResponse<List<DigitizationPropertyDayWiseDto>>
                        .Fail("Page size must be greater than 0.");
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
                command.Parameters.Add( new SqlParameter("@PageNumber", SqlDbType.Int) { Value = pageNumber });

                command.Parameters.Add( new SqlParameter("@PageSize", SqlDbType.Int) { Value = pageSize });

                await using var reader = await command.ExecuteReaderAsync();

                bool hasTotalRecords = false;
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    if (string.Equals(reader.GetName(i), "TotalRecords", StringComparison.OrdinalIgnoreCase))
                    {
                        hasTotalRecords = true;
                        break;
                    }
                }

                while (await reader.ReadAsync())
                {
                    result.Add(new DigitizationPropertyDayWiseDto
                    {
                        CreatedDate = Convert.ToDateTime(
                            reader["CreatedDate"]),

                        Count = Convert.ToInt32(reader["Count"]),
                        TotalRecords = hasTotalRecords && reader["TotalRecords"] != DBNull.Value
                            ? Convert.ToInt32(reader["TotalRecords"])
                            : 0
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

        public async Task<byte[]> ExportDigitizationPropertyDayWiseSummaryAsync(DateTime fromDate, DateTime toDate)
        {
            try
            {
                var response = await GetDigitizationPropertyDayWiseCountAsync(fromDate, toDate, pageNumber: 1, pageSize: 1000000);
                if (response == null || !response.Success)
                {
                    throw new InvalidOperationException(response?.Message ?? "Unable to fetch digitization property count for export.");
                }

                using var workbook = new XLWorkbook();
                var worksheet = workbook.Worksheets.Add("Digitization Property Summary");

                worksheet.Cell(1, 1).Value = "Digitization Property Summary Report";
                worksheet.Range(1, 1, 1, 3).Merge();
                worksheet.Row(1).Style.Font.Bold = true;
                worksheet.Row(1).Style.Font.FontSize = 13;
                worksheet.Row(1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                worksheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F5E9");

                // Headers (Row 3, so there is only 1 row space after heading)
                string[] headers = { "Sr. No.", "Date", "Digitized Properties Count" };
                for (int col = 0; col < headers.Length; col++)
                {
                    worksheet.Cell(3, col + 1).Value = headers[col];
                }

                var headerRow = worksheet.Row(3);
                headerRow.Style.Font.Bold = true;
                headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#1B4332");
                headerRow.Style.Font.FontColor = XLColor.White;
                headerRow.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var records = response.Data ?? new List<DigitizationPropertyDayWiseDto>();
                int row = 4;
                int srNo = 1;
                long totalCount = 0;

                foreach (var item in records)
                {
                    worksheet.Cell(row, 1).Value = srNo++;
                    worksheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    worksheet.Cell(row, 2).Value = item.CreatedDate.ToString("dd-MMM-yyyy");
                    worksheet.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    worksheet.Cell(row, 3).Value = item.Count;
                    worksheet.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";

                    totalCount += item.Count;
                    row++;
                }

                // Summary Row
                worksheet.Cell(row, 1).Value = "";
                worksheet.Cell(row, 2).Value = "Total";
                worksheet.Cell(row, 2).Style.Font.Bold = true;
                worksheet.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                worksheet.Cell(row, 3).Value = totalCount;
                worksheet.Cell(row, 3).Style.Font.Bold = true;
                worksheet.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";

                var totalRow = worksheet.Row(row);
                totalRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#F4F9F5");

                worksheet.Range(3, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                worksheet.Range(3, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return stream.ToArray();
            }
            catch (Exception ex)
            {
                throw new Exception("Error while exporting Digitization Property Summary to Excel.", ex);
            }
        }

        public async Task<byte[]> ExportDigitizationPropertyDayWiseSummaryPdfAsync(DateTime fromDate, DateTime toDate)
        {
            var response = await GetDigitizationPropertyDayWiseCountAsync(fromDate, toDate, pageNumber: 1, pageSize: 1000000);

            if (response == null || !response.Success)
            {
                throw new InvalidOperationException(response?.Message ?? "Unable to fetch digitization property summary.");
            }

            var data = response.Data ?? new List<DigitizationPropertyDayWiseDto>();
            long totalCount = data.Sum(d => (long)d.Count);

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            var primaryColor = QuestPDF.Infrastructure.Color.FromHex("#136f48");
            var headerBgColor = QuestPDF.Infrastructure.Color.FromHex("#1b4332");
            var zebraBgColor = QuestPDF.Infrastructure.Color.FromHex("#f8fafc");
            var borderColor = QuestPDF.Infrastructure.Color.FromHex("#cbd5e1");

            var document = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(QuestPDF.Helpers.PageSizes.A4.Portrait());
                    page.Margin(1.2f, QuestPDF.Infrastructure.Unit.Centimetre);
                    page.PageColor(QuestPDF.Helpers.Colors.White);

                    page.DefaultTextStyle(style => style.FontSize(9f));

                    // Header
                    page.Header().PaddingBottom(10).Column(headerCol =>
                    {
                        headerCol.Item().Row(row =>
                        {
                            row.RelativeItem().Column(titleCol =>
                            {
                                titleCol.Item().Text("Digitization Property Summary Report")
                                    .Bold()
                                    .FontSize(14f)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken4);

                                
                            });

                            row.ConstantItem(200).AlignRight().Column(metaCol =>
                            {
                                metaCol.Item().Text($"Date: {DateTime.Now:dd-MMM-yyyy hh:mm tt}")
                                    .FontSize(9.5f)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);

                                //metaCol.Item().PaddingTop(2).Text($"Total Properties: {totalCount:N0}")
                                //    .Bold()
                                //    .FontSize(9.5f)
                                //    .FontColor(primaryColor);
                            });
                        });

                        headerCol.Item().PaddingTop(6).LineHorizontal(1.5f).LineColor(primaryColor);
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
                                    .Text("No digitization property records found for the selected date range.")
                                    .FontSize(11)
                                    .FontColor(QuestPDF.Helpers.Colors.Grey.Darken1);
                            }
                            else
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(50); // S.No
                                        columns.RelativeColumn(2f); // Date
                                        columns.RelativeColumn(2f); // Count
                                    });

                                    // Table Header
                                    table.Header(header =>
                                    {
                                        void HeaderCell(string text, bool alignRight = false, bool alignCenter = false)
                                        {
                                            var cell = header.Cell()
                                                .Background(headerBgColor)
                                                .Border(0.5f)
                                                .BorderColor(borderColor)
                                                .PaddingVertical(6)
                                                .PaddingHorizontal(8);

                                            if (alignRight)
                                                cell.AlignRight().Text(text).Bold().FontSize(9f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else if (alignCenter)
                                                cell.AlignCenter().Text(text).Bold().FontSize(9f).FontColor(QuestPDF.Helpers.Colors.White);
                                            else
                                                cell.AlignLeft().Text(text).Bold().FontSize(9f).FontColor(QuestPDF.Helpers.Colors.White);
                                        }

                                        HeaderCell("Sr. No.", alignCenter: true);
                                        HeaderCell("Date", alignCenter: true);
                                        HeaderCell("Properties Count", alignRight: true);
                                    });

                                    // Table Rows
                                    int srNo = 1;
                                    foreach (var item in data)
                                    {
                                        var isZebra = (srNo % 2 == 0);
                                        var rowBg = isZebra ? zebraBgColor : QuestPDF.Helpers.Colors.White;

                                        void DataCell(string text, bool alignRight = false, bool alignCenter = false, bool isBold = false)
                                        {
                                            var cell = table.Cell()
                                                .Background(rowBg)
                                                .Border(0.5f)
                                                .BorderColor(borderColor)
                                                .PaddingVertical(5)
                                                .PaddingHorizontal(8);

                                            if (alignRight)
                                            {
                                                var t = cell.AlignRight().Text(text).FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken3);
                                                if (isBold) t.Bold();
                                            }
                                            else if (alignCenter)
                                            {
                                                var t = cell.AlignCenter().Text(text).FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken3);
                                                if (isBold) t.Bold();
                                            }
                                            else
                                            {
                                                var t = cell.AlignLeft().Text(text).FontSize(8.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Darken3);
                                                if (isBold) t.Bold();
                                            }
                                        }

                                        DataCell(srNo.ToString(), alignCenter: true);
                                        DataCell(item.CreatedDate.ToString("dd-MMM-yyyy"), alignCenter: true);
                                        DataCell(item.Count.ToString("N0"), alignRight: true, isBold: true);

                                        srNo++;
                                    }

                                    // Summary / Total Row
                                    table.Cell().ColumnSpan(2)
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(borderColor)
                                        .PaddingVertical(6)
                                        .PaddingHorizontal(8)
                                        .AlignRight()
                                        .Text("Total")
                                        .Bold()
                                        .FontSize(9.5f)
                                        .FontColor(primaryColor);

                                    table.Cell()
                                        .Background(QuestPDF.Infrastructure.Color.FromHex("#E8F5E9"))
                                        .Border(0.5f)
                                        .BorderColor(borderColor)
                                        .PaddingVertical(6)
                                        .PaddingHorizontal(8)
                                        .AlignRight()
                                        .Text(totalCount.ToString("N0"))
                                        .Bold()
                                        .FontSize(9.5f)
                                        .FontColor(primaryColor);
                                });
                            }
                        });

                    // Footer
                    page.Footer().PaddingTop(6).Column(footerCol =>
                    {
                        footerCol.Item().LineHorizontal(0.5f).LineColor(borderColor);
                        footerCol.Item().PaddingTop(3).Row(row =>
                        {
                            row.RelativeItem().Text("PSAMB Colonization").FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                            row.RelativeItem().AlignRight().Text(text =>
                            {
                                text.Span("Page ").FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                                text.CurrentPageNumber().FontSize(8f).Bold();
                                text.Span(" of ").FontSize(7.5f).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                                text.TotalPages().FontSize(8f).Bold();
                            });
                        });
                    });
                });
            });

            return document.GeneratePdf();
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
