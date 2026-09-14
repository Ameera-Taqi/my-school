namespace SchoolPerformance.Api.Entities;

public class AcademicStage : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
}
