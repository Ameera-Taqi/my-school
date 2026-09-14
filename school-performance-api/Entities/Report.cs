namespace SchoolPerformance.Api.Entities;

public enum ReportType { GENERAL, ACADEMIC, ATTENDANCE, BEHAVIOR, PERFORMANCE }

public class Report : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ReportType ReportType { get; set; } = ReportType.GENERAL;
    public DateOnly ReportDate { get; set; }
    public long? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public string? FilePath { get; set; }
}
