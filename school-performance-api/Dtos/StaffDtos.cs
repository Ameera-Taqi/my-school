namespace SchoolPerformance.Api.Dtos;

public class DepartmentDto
{
    public long? Id { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? Active { get; set; }
    public long TeacherCount { get; set; }
}

public class TeacherDto
{
    public long? Id { get; set; }
    public string? EmployeeNumber { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Specialization { get; set; }
    public DateOnly? HireDate { get; set; }
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool? Active { get; set; }
    public bool? DepartmentHead { get; set; }
    /// <summary>Extra role WING_SUPERVISOR on the linked account.</summary>
    public bool? WingSupervisor { get; set; }
    public string? RoleKey { get; set; }
    public string? RoleName { get; set; }
    public string? Username { get; set; }
}

public class TeacherMonitoringDto
{
    public long Id { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public int ClassesCount { get; set; }
    public int AttendanceRate { get; set; }
    public int LessonPlanRate { get; set; }
    public double EvaluationScore { get; set; }
    public string LastVisitDate { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Strengths { get; set; } = string.Empty;
    public string Improvements { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
