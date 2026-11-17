namespace Backend.Models.DTOs
{
    public class DashboardDtos
    {

        public int TotalProperties { get; set; }
        public int SoldProperties { get; set; }
        public int UnsoldProperties { get; set; }
        public int DigitizedProperties { get; set; }
        public int ForfeitedProperties { get; set; }
        public int NdcIssued { get; set; }

    }
}
