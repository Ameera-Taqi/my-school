namespace SchoolPerformance.Api.Entities;

public enum ClassSwapStatus
{
    PendingTeacherApproval,
    PendingDepartmentHeadApproval,
    PendingAdministrationApproval,
    Approved,
    Rejected,
    Executed,
    Cancelled
}

public enum ClassSwapKind
{
    /// <summary>Exchange periods: each lesson moves to the other teacher's period.</summary>
    Exchange,
    /// <summary>Requester lesson moves into the counterparty period; counterparty lesson is cancelled that day.</summary>
    TakeOnly
}

public enum ClassSwapApprovalStage
{
    Teacher,
    Department,
    Administration
}

public enum ClassSwapDecision
{
    Pending,
    Approved,
    Rejected
}

/// <summary>One date-only period change between two teachers. The weekly grid is not edited.</summary>
public class ClassSwapRequest : BaseEntity
{
    public DateOnly SwapDate { get; set; }
    /// <summary>0 = Sunday … 4 = Thursday.</summary>
    public int Day { get; set; }
    public ClassSwapKind Kind { get; set; } = ClassSwapKind.Exchange;
    public long RequesterTeacherId { get; set; }
    public Teacher RequesterTeacher { get; set; } = null!;
    public long CounterpartyTeacherId { get; set; }
    public Teacher CounterpartyTeacher { get; set; } = null!;
    /// <summary>Weekly lesson the requester keeps teaching, moved to the other period on this date.</summary>
    public long RequesterEntryId { get; set; }
    public long CounterpartyEntryId { get; set; }
    public int RequesterPeriod { get; set; }
    public int CounterpartyPeriod { get; set; }
    public string RequesterSubject { get; set; } = string.Empty;
    public string RequesterClassName { get; set; } = string.Empty;
    public string CounterpartySubject { get; set; } = string.Empty;
    public string CounterpartyClassName { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public ClassSwapStatus Status { get; set; } = ClassSwapStatus.PendingTeacherApproval;
    public long CreatedByUserId { get; set; }
    public User CreatedBy { get; set; } = null!;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public ICollection<ClassSwapApproval> Approvals { get; set; } = new List<ClassSwapApproval>();
    public ICollection<ClassSwapHistory> History { get; set; } = new List<ClassSwapHistory>();
}

public class ClassSwapApproval : BaseEntity
{
    public long RequestId { get; set; }
    public ClassSwapRequest Request { get; set; } = null!;
    public ClassSwapApprovalStage Stage { get; set; }
    public long? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public long? ApproverTeacherId { get; set; }
    public ClassSwapDecision Decision { get; set; } = ClassSwapDecision.Pending;
    public long? ActedByUserId { get; set; }
    public User? ActedBy { get; set; }
    public DateTime? ActedAt { get; set; }
    public string? Comment { get; set; }
}

public class ClassSwapHistory : BaseEntity
{
    public long RequestId { get; set; }
    public ClassSwapRequest Request { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public long UserId { get; set; }
    public User User { get; set; } = null!;
    public string RoleLabel { get; set; } = string.Empty;
    public string? Comment { get; set; }
}

/// <summary>
/// Moves or cancels one weekly lesson on a single date.
/// The ScheduleEntry row itself stays on the weekly grid.
/// </summary>
public class ScheduleOverride : BaseEntity
{
    public DateOnly OverrideDate { get; set; }
    public long ScheduleEntryId { get; set; }
    public ScheduleEntry ScheduleEntry { get; set; } = null!;
    public int EffectivePeriod { get; set; }
    /// <summary>When true, the lesson is cancelled for OverrideDate and EffectivePeriod is ignored.</summary>
    public bool Cancelled { get; set; }
    public long SwapRequestId { get; set; }
    public ClassSwapRequest SwapRequest { get; set; } = null!;
    public long CreatedByUserId { get; set; }
}

public class ClassSwapNotice : BaseEntity
{
    public long UserId { get; set; }
    public User User { get; set; } = null!;
    public long RequestId { get; set; }
    public ClassSwapRequest Request { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public DateTime? ReadAt { get; set; }
}
