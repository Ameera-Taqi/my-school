namespace SchoolPerformance.Api.Entities;

public enum RecordStatus
{
    Draft,
    PendingApproval,
    Approved,
    Rejected,
    ReturnedForRevision,
    Cancelled
}

public enum RecordApprovalLevel
{
    None,
    Department,
    Administration
}

public class RecordCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
}

public class StaffRecord : BaseEntity
{
    public long OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public long CategoryId { get; set; }
    public RecordCategory? Category { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public RecordStatus Status { get; set; } = RecordStatus.Draft;
    public RecordApprovalLevel ApprovalLevel { get; set; } = RecordApprovalLevel.None;
    public long? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string? AuthorityLabel { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public RecordFile? File { get; set; }
    public ICollection<RecordEvent> Events { get; set; } = new List<RecordEvent>();
}

public class RecordFile : BaseEntity
{
    public long RecordId { get; set; }
    public StaffRecord? Record { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public byte[] Content { get; set; } = Array.Empty<byte>();
}

public class RecordEvent : BaseEntity
{
    public long RecordId { get; set; }
    public StaffRecord? Record { get; set; }
    public long? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string RoleLabel { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public RecordStatus? PreviousStatus { get; set; }
    public RecordStatus? NewStatus { get; set; }
}

public class RecordNotice : BaseEntity
{
    public long UserId { get; set; }
    public User? User { get; set; }
    public long RecordId { get; set; }
    public StaffRecord? Record { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? ReadAt { get; set; }
}
