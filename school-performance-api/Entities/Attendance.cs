namespace SchoolPerformance.Api.Entities;

public enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }

/// <summary>
/// One student's attendance for one day and one slot.
/// Period 0 is the daily record (wing supervisor / morning assembly).
/// Periods 1–7 are the teaching periods recorded by the teacher.
/// </summary>
public class Attendance : BaseEntity
{
    public long StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public DateOnly AttendanceDate { get; set; }
    /// <summary>0 = daily attendance. 1–7 = a teaching period.</summary>
    public int Period { get; set; }
    public AttendanceStatus Status { get; set; }
    /// <summary>Clock time when this student was marked late. Cleared for any other status.</summary>
    public TimeOnly? LateTime { get; set; }
    public string? Notes { get; set; }
    public long? RecordedById { get; set; }
    public User? RecordedBy { get; set; }
    /// <summary>Set only when a wing supervisor changes this period's status. A teacher save leaves it in place.</summary>
    public long? WingEditedById { get; set; }
    public User? WingEditedBy { get; set; }
}

/// <summary>A reminder asking the subject teacher to submit period attendance.</summary>
public class AttendanceReminder : BaseEntity
{
    public long TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;
    public long SchoolClassId { get; set; }
    public SchoolClass SchoolClass { get; set; } = null!;
    public int Period { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    /// <summary>AUTO when half the period has passed. SUPERVISOR when the wing supervisor presses the button.</summary>
    public string Source { get; set; } = "AUTO";
    public DateTime? ReadAt { get; set; }
}

/// <summary>One teacher's attendance for one day.</summary>
public class TeacherAttendance : BaseEntity
{
    public long TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;
    public DateOnly AttendanceDate { get; set; }
    public AttendanceStatus Status { get; set; }
    /// <summary>Arrival time (school local time).</summary>
    public TimeOnly? CheckInTime { get; set; }
    /// <summary>Mid-day presence check time (school local time).</summary>
    public TimeOnly? PresenceTime { get; set; }
    /// <summary>Departure time (school local time).</summary>
    public TimeOnly? CheckOutTime { get; set; }
    public string? Notes { get; set; }

    /// <summary>Work minutes between check-in and check-out, when both are recorded.</summary>
    public int? PresenceMinutes => CheckInTime != null && CheckOutTime != null && CheckOutTime > CheckInTime
        ? (int)(CheckOutTime.Value - CheckInTime.Value).TotalMinutes
        : null;
    public long? RecordedById { get; set; }
    public User? RecordedBy { get; set; }
}
