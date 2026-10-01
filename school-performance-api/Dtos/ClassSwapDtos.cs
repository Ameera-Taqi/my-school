using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

public class CreateClassSwapRequest
{
    [Required] public DateOnly Date { get; set; }
    /// <summary>Exchange (default) or TakeOnly.</summary>
    public string Kind { get; set; } = "Exchange";
    [Range(1, long.MaxValue)] public long MyEntryId { get; set; }
    [Range(1, long.MaxValue)] public long OtherTeacherId { get; set; }
    [Range(1, long.MaxValue)] public long OtherEntryId { get; set; }
    [MaxLength(500)] public string? Reason { get; set; }
}

public class ClassSwapCommentRequest
{
    [MaxLength(500)] public string? Comment { get; set; }
}

public class ClassSwapLessonDto
{
    public long EntryId { get; set; }
    public int Period { get; set; }
    public string PeriodTime { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public long TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public bool Swapped { get; set; }
}

public class ClassSwapSideDto
{
    public string TeacherName { get; set; } = string.Empty;
    public int Period { get; set; }
    public string PeriodTime { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public bool Cancelled { get; set; }
}

public class ClassSwapPreviewDto
{
    public bool Valid { get; set; }
    public string Kind { get; set; } = "Exchange";
    public string KindLabel { get; set; } = "تبديل مقابل";
    public List<string> Errors { get; set; } = [];
    public ClassSwapSideDto? BeforeRequester { get; set; }
    public ClassSwapSideDto? BeforeCounterparty { get; set; }
    public ClassSwapSideDto? AfterRequester { get; set; }
    public ClassSwapSideDto? AfterCounterparty { get; set; }
}

public class ClassSwapTeacherOptionDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
}

public class ClassSwapSummaryDto
{
    public int Pending { get; set; }
    public int Approved { get; set; }
    public int Rejected { get; set; }
    public int Executed { get; set; }
}

public class ClassSwapListItemDto
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string DayLabel { get; set; } = string.Empty;
    public string Kind { get; set; } = "Exchange";
    public string KindLabel { get; set; } = "تبديل مقابل";
    public string RequesterTeacher { get; set; } = string.Empty;
    public int RequesterPeriod { get; set; }
    public string RequesterSubject { get; set; } = string.Empty;
    public string RequesterClassName { get; set; } = string.Empty;
    public string CounterpartyTeacher { get; set; } = string.Empty;
    public int CounterpartyPeriod { get; set; }
    public string CounterpartySubject { get; set; } = string.Empty;
    public string CounterpartyClassName { get; set; } = string.Empty;
    public string? Departments { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool CanApprove { get; set; }
    public bool CanReject { get; set; }
    public bool CanCancel { get; set; }
    public bool CanExecute { get; set; }
}

public class ClassSwapListResponse
{
    public string Perspective { get; set; } = "teacher";
    public ClassSwapSummaryDto Summary { get; set; } = new();
    public List<ClassSwapListItemDto> Items { get; set; } = [];
}

public class ClassSwapApprovalDto
{
    public string Stage { get; set; } = string.Empty;
    public string StageLabel { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string Decision { get; set; } = string.Empty;
    public string DecisionLabel { get; set; } = string.Empty;
    public string? ActedBy { get; set; }
    public DateTime? ActedAt { get; set; }
    public string? Comment { get; set; }
}

public class ClassSwapHistoryDto
{
    public string Action { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string RoleLabel { get; set; } = string.Empty;
    public DateTime At { get; set; }
    public string? Comment { get; set; }
}

public class ClassSwapDetailDto : ClassSwapListItemDto
{
    public string? Reason { get; set; }
    public string RequesterDepartment { get; set; } = string.Empty;
    public string CounterpartyDepartment { get; set; } = string.Empty;
    public ClassSwapSideDto BeforeRequester { get; set; } = new();
    public ClassSwapSideDto BeforeCounterparty { get; set; } = new();
    public ClassSwapSideDto AfterRequester { get; set; } = new();
    public ClassSwapSideDto AfterCounterparty { get; set; } = new();
    public List<ClassSwapApprovalDto> Approvals { get; set; } = [];
    public List<ClassSwapHistoryDto> History { get; set; } = [];
}

public class ClassSwapNoticeDto
{
    public long Id { get; set; }
    public long RequestId { get; set; }
    public string Message { get; set; } = string.Empty;
}
