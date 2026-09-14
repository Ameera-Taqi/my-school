namespace SchoolPerformance.Api.Entities;

public class SchoolClass : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string? Notes { get; set; }
    public long AcademicStageId { get; set; }
    public AcademicStage AcademicStage { get; set; } = null!;
}
