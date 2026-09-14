namespace SchoolPerformance.Api.Entities;

public enum CalendarEventType { PUBLIC, PERSONAL }

public class CalendarEvent : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public CalendarEventType EventType { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public long CreatedByUserId { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<CalendarEventTargetRole> TargetRoles { get; set; } = new List<CalendarEventTargetRole>();

    public IEnumerable<string> TargetRoleKeys => TargetRoles.Select(t => t.RoleKey);
}

public class CalendarEventTargetRole
{
    public long CalendarEventId { get; set; }
    public CalendarEvent CalendarEvent { get; set; } = null!;
    public string RoleKey { get; set; } = string.Empty;
}
