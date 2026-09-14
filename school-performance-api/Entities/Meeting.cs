namespace SchoolPerformance.Api.Entities;

public enum MeetingStatus { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED }

public class Meeting : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public DateTime MeetingDate { get; set; }
    public string? Attendees { get; set; }
    public string? Agenda { get; set; }
    public string? Minutes { get; set; }
    public string? FollowUpTasks { get; set; }
    public string? Location { get; set; }
    public MeetingStatus Status { get; set; } = MeetingStatus.SCHEDULED;
    public long? OrganizerId { get; set; }
    public User? Organizer { get; set; }
    /// <summary>Calendar event mirrored for the targeted roles, if any.</summary>
    public long? CalendarEventId { get; set; }
    public CalendarEvent? CalendarEvent { get; set; }
    public ICollection<MeetingTargetRole> TargetRoles { get; set; } = new List<MeetingTargetRole>();

    public IEnumerable<string> TargetRoleKeys => TargetRoles.Select(t => t.RoleKey);
}

public class MeetingTargetRole
{
    public long MeetingId { get; set; }
    public Meeting Meeting { get; set; } = null!;
    public string RoleKey { get; set; } = string.Empty;
}
