using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

// ---- Meetings ----
public class MeetingDto
{
    public long? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    /// <summary>"yyyy-MM-ddTHH:mm" (local school time).</summary>
    public string MeetingDate { get; set; } = string.Empty;
    public string? Attendees { get; set; }
    public string? Agenda { get; set; }
    public string? Minutes { get; set; }
    public string? FollowUpTasks { get; set; }
    public string? Location { get; set; }
    public string? Status { get; set; }
    public List<string> TargetRoleKeys { get; set; } = new();
    public long? CalendarEventId { get; set; }
}

public class MeetingRequest
{
    [Required(ErrorMessage = "عنوان الاجتماع مطلوب")]
    public string Title { get; set; } = string.Empty;
    [Required(ErrorMessage = "تاريخ الاجتماع مطلوب")]
    public string MeetingDate { get; set; } = string.Empty;
    public string? Attendees { get; set; }
    public string? Agenda { get; set; }
    public string? Minutes { get; set; }
    public string? FollowUpTasks { get; set; }
    public string? Location { get; set; }
    public string? Status { get; set; }
    public List<string>? TargetRoleKeys { get; set; }
}

// ---- Tasks ----
public class TaskDto
{
    public long? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Assignee { get; set; }
    /// <summary>"yyyy-MM-dd"</summary>
    public string? DueDate { get; set; }
    public string Priority { get; set; } = "MEDIUM";
    public string Status { get; set; } = "NEW";
    public long? MeetingId { get; set; }
    public string? MeetingTitle { get; set; }
}

public class TaskRequest
{
    [Required(ErrorMessage = "عنوان المهمة مطلوب")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Assignee { get; set; }
    public string? DueDate { get; set; }
    public string? Priority { get; set; }
    public string? Status { get; set; }
    public long? MeetingId { get; set; }
    public string? MeetingTitle { get; set; }
}

// ---- Attendance ----
/// <summary>Mirrors the frontend AttendanceRecord shape.</summary>
public class AttendanceRecordDto
{
    public long? Id { get; set; }
    public long PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public string PersonType { get; set; } = "STUDENT";
    public string? StageName { get; set; }
    public string? ClassName { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Status { get; set; } = "PRESENT";
    public string? Notes { get; set; }
    /// <summary>"HH:mm" — teachers only.</summary>
    public string? CheckInTime { get; set; }
    /// <summary>"HH:mm" — mid-day presence check, teachers only.</summary>
    public string? PresenceTime { get; set; }
    /// <summary>"HH:mm" — teachers only.</summary>
    public string? CheckOutTime { get; set; }
    /// <summary>Computed work minutes between check-in and check-out (teachers only).</summary>
    public int? PresenceMinutes { get; set; }
}

/// <summary>Who the caller may see on the teacher-attendance page.</summary>
public class TeacherAttendanceScopeDto
{
    /// <summary>ALL | DEPARTMENT | SELF | NONE</summary>
    public string Scope { get; set; } = "NONE";
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public long? TeacherId { get; set; }
    public string? TeacherName { get; set; }
    /// <summary>True when the caller may record/edit teacher attendance.</summary>
    public bool CanRecord { get; set; }
    public int TeachersCount { get; set; }
}

public class AttendanceSummaryDto
{
    public string Date { get; set; } = string.Empty;
    public int StudentsTotal { get; set; }
    public int Recorded { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Excused { get; set; }
    /// <summary>Present + late as a percentage of recorded students; null when nothing recorded.</summary>
    public double? Rate { get; set; }
}
