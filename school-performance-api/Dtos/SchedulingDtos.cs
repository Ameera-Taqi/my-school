using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

public class SubjectDto
{
    public long? Id { get; set; }
    [Required(ErrorMessage = "اسم المادة مطلوب")]
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Color { get; set; }
    public bool? Active { get; set; }
}

public class AssignmentDto
{
    public long? Id { get; set; }
    public long ClassId { get; set; }
    public string? ClassName { get; set; }
    public long SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? SubjectColor { get; set; }
    public long TeacherId { get; set; }
    public string? TeacherName { get; set; }
    [Range(1, 35, ErrorMessage = "عدد الحصص يجب أن يكون بين 1 و 35")]
    public int PeriodsPerWeek { get; set; }
    /// <summary>How many lessons of this assignment are currently on the timetable.</summary>
    public int Scheduled { get; set; }
}

public class TeacherConstraintDto
{
    public long? Id { get; set; }
    public long TeacherId { get; set; }
    public string? TeacherName { get; set; }
    [Required(ErrorMessage = "نوع القيد مطلوب")]
    public string Type { get; set; } = string.Empty;
    public string? DayOfWeek { get; set; }
    public int? Period { get; set; }
    public int? Value { get; set; }
    public string? Note { get; set; }
    public string? Description { get; set; }
}

public class ScheduleEntryDto
{
    public long? Id { get; set; }
    public long ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public int Period { get; set; }
    public long SubjectId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? SubjectColor { get; set; }
    public long TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public string? Room { get; set; }
    public bool Locked { get; set; }
}

public class ScheduleSlotRequest
{
    public long ClassId { get; set; }
    [Required] public string DayOfWeek { get; set; } = string.Empty;
    [Range(1, 7)] public int Period { get; set; }
    /// <summary>null clears the slot.</summary>
    public long? AssignmentId { get; set; }
    public string? Room { get; set; }
    public bool Locked { get; set; } = true;
}

public class GenerateScheduleRequest
{
    /// <summary>Empty = all classes.</summary>
    public List<long>? ClassIds { get; set; }
    /// <summary>Keep manually locked lessons where they are.</summary>
    public bool KeepLocked { get; set; } = true;
    public int? Seed { get; set; }
}

public class UnplacedLessonDto
{
    public long ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string TeacherName { get; set; } = string.Empty;
    public int Missing { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class GenerateScheduleResultDto
{
    public bool Success { get; set; }
    public int RequiredLessons { get; set; }
    public int PlacedLessons { get; set; }
    public int ClassesCount { get; set; }
    public List<UnplacedLessonDto> Unplaced { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public long DurationMs { get; set; }
    public int Attempts { get; set; }
}

public class ScheduleConflictDto
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public long? ClassId { get; set; }
    public long? TeacherId { get; set; }
    public string? DayOfWeek { get; set; }
    public int? Period { get; set; }
}

public class ClassScheduleSummaryDto
{
    public long ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string StageName { get; set; } = string.Empty;
    public int Required { get; set; }
    public int Scheduled { get; set; }
}

public class TeacherLoadDto
{
    public long TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public int Required { get; set; }
    public int Scheduled { get; set; }
    public int AvailableSlots { get; set; }
}

public class ScheduleOverviewDto
{
    public List<ClassScheduleSummaryDto> Classes { get; set; } = new();
    public List<TeacherLoadDto> Teachers { get; set; } = new();
    public List<ScheduleConflictDto> Conflicts { get; set; } = new();
}
