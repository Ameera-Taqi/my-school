using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

public class CalendarEventRequest
{
    [Required(ErrorMessage = "عنوان الحدث مطلوب")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    [Required(ErrorMessage = "تاريخ البداية مطلوب")]
    public string StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; }

    [Required(ErrorMessage = "نوع الحدث مطلوب")]
    public string EventType { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public HashSet<string>? TargetRoleKeys { get; set; }
}

public class CalendarEventDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? EventType { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public HashSet<string> TargetRoleKeys { get; set; } = new();
    public long? CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }
    public bool OwnedByCurrentUser { get; set; }
}
