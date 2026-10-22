using ClosedXML.Excel;

namespace Backend.Models.DTOs
{
    public class ReportDto
    {
        public string? AllotteeCode { get; set; }
        public string? AllotteeName { get; set; }
        public string? AllotteeFatherName { get; set; }

        public int PropertyAllotteeId { get; set; }

        public int DistrictId { get; set; }
        public string? DistrictName { get; set; }

        public int BranchId { get; set; }
        public string? BranchName { get; set; }

        public int MandiId { get; set; }
        public string? MandiName { get; set; }

        public int PropertyId { get; set; }

        public int PlotTypeId { get; set; }
        public string? PlotType { get; set; }

        public string? PlotNo { get; set; }
        public string? PlotSize { get; set; }

        public DateTime? AuctionDate { get; set; }
        public DateTime? DateOfAllotment { get; set; }
        public decimal? FinalBidPrice { get; set; }
        public string? AllotmentNumber { get; set; }



    }

    public class PlotWiseConsolidateDetailsDto
    {
        public string? PlotType { get; set; }
        public int? PlotTypeId { get; set; }
        public string? PlotSize { get; set; }
        public int TotalPlots { get; set; }
        public int TotalSoldPlots { get; set; }
        public int TotalUnsoldPlots { get; set; }
        public string? AllPlots { get; set; }
        public string? SoldPlots { get; set; }
        public string? UnsoldPlots { get; set; }
        public int TotalRecords { get; set; }
        public int MandiTotalPlots { get; set; }
        public int MandiTotalSoldPlots { get; set; }
        public int MandiTotalUnsoldPlots { get; set; }
    }

    public class MandiForPropertyReportDto
    {
        public long MandiId { get; set; }
        public string? MandiName { get; set; }
        public int DistrictId { get; set; }
    }

    public class PlotSoldUnsoldDto
    {
        public int SrNo { get; set; }

        public int DistrictId { get; set; }

        public string? DistrictName { get; set; }

        public int BranchId { get; set; }

        public string? MarketCommittee { get; set; }

        public int TotalPlots { get; set; }

        public int SoldPlots { get; set; }

        public int UnsoldPlots { get; set; }

        public int TotalRecords { get; set; }
    }


    public class DigitizationPropertyDayWiseDto
    {
        public DateTime CreatedDate { get; set; }
        public int Count { get; set; }
        public int TotalRecords { get; set; }
    }

    public class DigitizationPropertyDayWiseDetailsDto
    {
        public string? PropertyCode { get; set; }
    }

    public class MandiWiseAllotmentSummaryDto
    {
        public int MandiId { get; set; }
        public string? MandiName { get; set; }
        public int BranchId { get; set; }
        public int DistrictId { get; set; }
    }

    public class PagedResponse<T>
    {
        

        public int PageNumber { get; set; }

        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public int TotalRecords { get; set; }
        public int MandiTotalPlots { get; set; }
        public int MandiTotalSoldPlots { get; set; }
        public int MandiTotalUnsoldPlots { get; set; }
        public int OverallTotalPlots { get; set; }
        public int OverallSoldPlots { get; set; }
        public int OverallUnsoldPlots { get; set; }
        public List<T> Data { get; set; } = new();
    }

    public class MandiWiseReportColumnDef
    {
        public string Key { get; set; } = "";
        public string Header { get; set; } = "";
        public float PdfWeight { get; set; } = 1.0f;
        public bool AlignCenter { get; set; }
        public bool AlignRight { get; set; }
        public bool Bold { get; set; }
        public Action<IXLCell, ReportDto, int> SetExcelCell { get; set; } = (c, d, s) => { };
        public Func<ReportDto, int, string> GetPdfText { get; set; } = (d, s) => "";
    }

}
