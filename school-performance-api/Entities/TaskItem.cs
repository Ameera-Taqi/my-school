namespace SchoolPerformance.Api.Entities;

public enum TaskStatus { NEW, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED }

public enum TaskPriority { LOW, MEDIUM, HIGH, URGENT }

public class TaskItem : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Display label for assignees (kept for older rows and PDF export).</summary>
    public string? Assignee { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.NEW;
    public TaskPriority Priority { get; set; } = TaskPriority.MEDIUM;
    public DateOnly? DueDate { get; set; }
    public string? Notes { get; set; }
    public string? CancelReason { get; set; }
    public long? MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public long? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }
    public long? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public ICollection<TaskAssignee> Assignees { get; set; } = new List<TaskAssignee>();
    public ICollection<TaskActivity> Activities { get; set; } = new List<TaskActivity>();
}

public class TaskAssignee : BaseEntity
{
    public long TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.NEW;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletionComment { get; set; }
}

public class TaskActivity : BaseEntity
{
    public long TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public long? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string RoleLabel { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public TaskStatus? PreviousStatus { get; set; }
    public TaskStatus? NewStatus { get; set; }
}

public class TaskNotice : BaseEntity
{
    public long UserId { get; set; }
    public User? User { get; set; }
    public long TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? ReadAt { get; set; }
}
