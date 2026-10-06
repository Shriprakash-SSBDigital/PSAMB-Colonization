namespace Backend.Models.DTOs
{
    public class ReportDto
    {
        public string? AllotteeCode { get; set; }
        public string? AllotteeName { get; set; }
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

    }

    public class PlotWiseConsolidateDetailsDto
    {
        public string? PlotType { get; set; }
        public string? PlotSize { get; set; }
        public int TotalPlots { get; set; }
        public int TotalSoldPlots { get; set; }
        public int TotalUnsoldPlots { get; set; }
        public string? AllPlots { get; set; }
        public string? SoldPlots { get; set; }
        public string? UnsoldPlots { get; set; }
    }

    public class MandiForPropertyReportDto
    {
        public long MandiId { get; set; }
        public string? MandiName { get; set; }
        public int DistrictId { get; set; }
    }
}
