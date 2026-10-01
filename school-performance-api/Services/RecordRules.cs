using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public static class RecordRules
{
    public const int MaxBytes = 10 * 1024 * 1024;

    public sealed record Route(RecordApprovalLevel Level, string AuthorityLabel);

    public static readonly string[] Extensions = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp"];

    public static bool CanEdit(RecordStatus status) =>
        status is RecordStatus.Draft or RecordStatus.ReturnedForRevision;

    public static bool CanDelete(RecordStatus status) =>
        status is RecordStatus.Draft or RecordStatus.Rejected or RecordStatus.ReturnedForRevision or RecordStatus.Cancelled;

    public static bool CanSubmit(RecordStatus status) =>
        status is RecordStatus.Draft or RecordStatus.ReturnedForRevision;

    public static bool CanCancel(RecordStatus status) => status == RecordStatus.PendingApproval;

    public static bool CanDecide(long actorId, long ownerId, bool inScope) =>
        actorId != ownerId && inScope;

    /// <summary>
    /// Immediate superior only. A department head goes to school administration.
    /// A teacher goes to the head of their department. Leadership has no further superior.
    /// </summary>
    public static Route? RouteFor(
        bool isDepartmentHead,
        bool isSchoolLeadership,
        long? departmentId,
        int activeHeadsExcludingOwner,
        out string? error)
    {
        if (isDepartmentHead)
        {
            error = null;
            return new Route(RecordApprovalLevel.Administration, "الإدارة المدرسية");
        }

        if (isSchoolLeadership)
        {
            error = "لا توجد جهة اعتماد أعلى من حسابك في الهيكل التنظيمي.";
            return null;
        }

        if (departmentId == null)
        {
            error = "لا توجد شعبة مرتبطة بحسابك، لذا لا يمكن تحديد رئيس الشعبة.";
            return null;
        }

        if (activeHeadsExcludingOwner < 1)
        {
            error = "لا يوجد رئيس شعبة نشط لهذه الشعبة.";
            return null;
        }

        error = null;
        return new Route(RecordApprovalLevel.Department, "رئيس الشعبة");
    }

    public static string StatusLabel(RecordStatus status, RecordApprovalLevel level) => status switch
    {
        RecordStatus.Draft => "مسودة",
        RecordStatus.PendingApproval when level == RecordApprovalLevel.Administration => "بانتظار اعتماد الإدارة",
        RecordStatus.PendingApproval => "بانتظار اعتماد رئيس الشعبة",
        RecordStatus.Approved => "معتمد",
        RecordStatus.Rejected => "مرفوض",
        RecordStatus.ReturnedForRevision => "معاد للتعديل",
        RecordStatus.Cancelled => "ملغي",
        _ => status.ToString()
    };

    public static string? FileProblem(string? fileName, byte[]? content)
    {
        if (content == null || content.Length == 0) return "الملف فارغ.";
        if (content.Length > MaxBytes) return "حجم الملف يتجاوز 10 ميغابايت.";
        var extension = Path.GetExtension(fileName ?? "").TrimStart('.').ToLowerInvariant();
        if (!Extensions.Contains(extension)) return "نوع الملف غير مسموح.";
        if (!SignatureMatches(extension, content)) return "محتوى الملف لا يطابق نوعه.";
        return null;
    }

    public static string ContentTypeFor(string fileName)
    {
        var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        return extension switch
        {
            "pdf" => "application/pdf",
            "png" => "image/png",
            "jpg" or "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "doc" => "application/msword",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls" => "application/vnd.ms-excel",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };
    }

    public static bool CanPreview(string contentType) =>
        contentType is "application/pdf" or "image/png" or "image/jpeg" or "image/webp";

    private static bool SignatureMatches(string extension, byte[] content)
    {
        bool starts(params byte[] magic) => content.Length >= magic.Length && magic.Select((b, i) => content[i] == b).All(ok => ok);
        return extension switch
        {
            "pdf" => starts(0x25, 0x50, 0x44, 0x46),
            "png" => starts(0x89, 0x50, 0x4E, 0x47),
            "jpg" or "jpeg" => starts(0xFF, 0xD8, 0xFF),
            "webp" => starts(0x52, 0x49, 0x46, 0x46) && content.Length >= 12 && content[8] == 0x57 && content[9] == 0x45 && content[10] == 0x42 && content[11] == 0x50,
            "doc" or "xls" => starts(0xD0, 0xCF, 0x11, 0xE0),
            "docx" or "xlsx" => starts(0x50, 0x4B, 0x03, 0x04),
            _ => false
        };
    }
}
