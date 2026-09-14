namespace SchoolPerformance.Api.Entities;

public enum TaskStatus { NEW, IN_PROGRESS, COMPLETED, OVERDUE }

public enum TaskPriority { LOW, MEDIUM, HIGH }

public class TaskItem : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Free-text assignee as entered by the manager (a person or a role).</summary>
    public string? Assignee { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.NEW;
    public TaskPriority Priority { get; set; } = TaskPriority.MEDIUM;
    public DateOnly? DueDate { get; set; }
    public long? MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public long? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }
    public long? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
}
