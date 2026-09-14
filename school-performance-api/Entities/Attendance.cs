namespace SchoolPerformance.Api.Entities;

public enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }

/// <summary>One student's attendance for one day.</summary>
public class Attendance : BaseEntity
{
    public long StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public DateOnly AttendanceDate { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }
    public long? RecordedById { get; set; }
    public User? RecordedBy { get; set; }
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
