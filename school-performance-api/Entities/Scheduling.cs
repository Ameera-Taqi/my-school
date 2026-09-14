namespace SchoolPerformance.Api.Entities;

/// <summary>A taught subject (رياضيات، علوم ...).</summary>
public class Subject : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    /// <summary>Hex color used for the timetable cell.</summary>
    public string? Color { get; set; }
    public bool Active { get; set; } = true;
    /// <summary>Owning department (المواد التابعة للشعبة); null when not assigned yet.</summary>
    public long? DepartmentId { get; set; }
    public Department? Department { get; set; }
}

/// <summary>"Class X studies subject Y with teacher Z for N periods a week."</summary>
public class ClassSubjectAssignment : BaseEntity
{
    public long SchoolClassId { get; set; }
    public SchoolClass SchoolClass { get; set; } = null!;
    public long SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
    public long TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;
    public int PeriodsPerWeek { get; set; }
}

public enum TeacherConstraintType
{
    /// <summary>Whole day off (Day required).</summary>
    UNAVAILABLE_DAY,
    /// <summary>A period number blocked on every day (Period required).</summary>
    UNAVAILABLE_PERIOD,
    /// <summary>One specific day + period blocked.</summary>
    UNAVAILABLE_SLOT,
    NO_FIRST_PERIOD,
    NO_LAST_PERIOD,
    /// <summary>At most Value periods on any single day.</summary>
    MAX_PERIODS_PER_DAY
}

public class TeacherConstraint : BaseEntity
{
    public long TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;
    public TeacherConstraintType Type { get; set; }
    /// <summary>0 = Sunday … 4 = Thursday.</summary>
    public int? Day { get; set; }
    /// <summary>1..7</summary>
    public int? Period { get; set; }
    public int? Value { get; set; }
    public string? Note { get; set; }
}

/// <summary>One lesson in the weekly timetable of a class.</summary>
public class ScheduleEntry : BaseEntity
{
    public long SchoolClassId { get; set; }
    public SchoolClass SchoolClass { get; set; } = null!;
    /// <summary>0 = Sunday … 4 = Thursday.</summary>
    public int Day { get; set; }
    /// <summary>1..7</summary>
    public int Period { get; set; }
    public long SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
    public long TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;
    public string? Room { get; set; }
    /// <summary>Manually placed; the generator keeps it in place.</summary>
    public bool Locked { get; set; }
}
