using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

public class RecordCategoryDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class RecordListItemDto
{
    public long Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public long CategoryId { get; set; }
    public string? Description { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public bool CanPreview { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public string? AuthorityLabel { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool CanSubmit { get; set; }
    public bool CanCancel { get; set; }
    public bool CanDecide { get; set; }
    public string RowVersion { get; set; } = string.Empty;
}

public class RecordDetailDto : RecordListItemDto
{
    public List<RecordEventDto> Events { get; set; } = [];
}

public class RecordEventDto
{
    public string Action { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string RoleLabel { get; set; } = string.Empty;
    public DateTime At { get; set; }
    public string? Comment { get; set; }
}

public class RecordListResponse
{
    public List<RecordListItemDto> Items { get; set; } = [];
    public RecordSummaryDto Summary { get; set; } = new();
}

public class RecordSummaryDto
{
    public int Total { get; set; }
    public int Pending { get; set; }
    public int Approved { get; set; }
    public int Returned { get; set; }
}

public class RecordCommentRequest
{
    [MaxLength(500)] public string? Comment { get; set; }
}

public class RecordNoticeDto
{
    public long Id { get; set; }
    public long RecordId { get; set; }
    public string Message { get; set; } = string.Empty;
}
