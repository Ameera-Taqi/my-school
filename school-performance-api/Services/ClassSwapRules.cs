using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>Pure checks for a one-day period exchange. Does not read or write the weekly timetable.</summary>
public static class ClassSwapRules
{
    public static readonly string[] DayKeys = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];
    public static readonly string[] DayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    private static readonly (string Start, string End)[] PeriodTimes =
    [
        ("07:55", "08:40"),
        ("08:45", "09:30"),
        ("09:35", "10:20"),
        ("10:35", "11:20"),
        ("11:25", "12:10"),
        ("12:20", "13:05"),
        ("13:10", "13:55")
    ];

    public sealed record LessonSlot(long EntryId, long TeacherId, long ClassId, int Period);

    public static int? SchoolDayIndex(DateOnly date)
    {
        var day = (int)date.DayOfWeek;
        return day is >= 0 and <= 4 ? day : null;
    }

    public static string? DateProblem(DateOnly date, DateOnly today, bool holiday)
    {
        if (date < today) return "لا يمكن طلب التبديل لتاريخ مضى.";
        if (SchoolDayIndex(date) == null) return "هذا اليوم ليس يوماً دراسياً.";
        if (holiday) return "هذا التاريخ إجازة رسمية.";
        return null;
    }

    public static string PeriodRange(int period) =>
        period is >= 1 and <= 7 ? $"{PeriodTimes[period - 1].Start}–{PeriodTimes[period - 1].End}" : string.Empty;

    public static string DayLabel(int day) => day is >= 0 and <= 4 ? DayLabels[day] : string.Empty;

    public static string DayKey(int day) => day is >= 0 and <= 4 ? DayKeys[day] : string.Empty;

    public static string KindLabel(ClassSwapKind kind) => kind switch
    {
        ClassSwapKind.TakeOnly => "أخذ دون مقابل",
        _ => "تبديل مقابل"
    };

    public static bool TryParseKind(string? value, out ClassSwapKind kind)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("Exchange", StringComparison.OrdinalIgnoreCase))
        {
            kind = ClassSwapKind.Exchange;
            return true;
        }
        if (value.Equals("TakeOnly", StringComparison.OrdinalIgnoreCase))
        {
            kind = ClassSwapKind.TakeOnly;
            return true;
        }
        kind = ClassSwapKind.Exchange;
        return false;
    }

    /// <summary>One head when both teachers share a department, otherwise both departments.</summary>
    public static IReadOnlyList<long> RequiredDepartments(long? departmentA, long? departmentB)
    {
        if (departmentA == null || departmentB == null)
        {
            throw new InvalidOperationException("كلا المعلمين يجب أن يكونا مرتبطين بشعبة.");
        }
        return departmentA == departmentB
            ? [departmentA.Value]
            : [departmentA.Value, departmentB.Value];
    }

    public static bool IsOpen(ClassSwapStatus status) => status is
        ClassSwapStatus.PendingTeacherApproval
        or ClassSwapStatus.PendingDepartmentHeadApproval
        or ClassSwapStatus.PendingAdministrationApproval
        or ClassSwapStatus.Approved;

    public static bool CanCancel(ClassSwapStatus status) => status is
        ClassSwapStatus.PendingTeacherApproval
        or ClassSwapStatus.PendingDepartmentHeadApproval
        or ClassSwapStatus.PendingAdministrationApproval;

    /// <summary>
    /// Teachers keep their own subject and class. Only the period numbers are exchanged.
    /// The input list is not modified.
    /// </summary>
    public static IReadOnlyList<string> CheckSwap(
        IReadOnlyList<LessonSlot> lessons,
        long entryA,
        long entryB,
        long teacherA,
        long teacherB)
    {
        var errors = new List<string>();
        if (entryA == entryB) errors.Add("اختر حصتين مختلفتين.");
        if (teacherA == teacherB) errors.Add("لا يمكن تبديل الحصة مع نفس المعلم.");

        var left = lessons.FirstOrDefault(slot => slot.EntryId == entryA);
        var right = lessons.FirstOrDefault(slot => slot.EntryId == entryB);
        if (left == null || right == null)
        {
            errors.Add("إحدى الحصتين غير موجودة في جدول هذا اليوم.");
            return errors;
        }
        if (left.TeacherId != teacherA) errors.Add("الحصة المختارة لا تخص المعلم مقدّم الطلب.");
        if (right.TeacherId != teacherB) errors.Add("الحصة المختارة لا تخص المعلم الآخر.");
        if (left.Period == right.Period) errors.Add("لا يمكن تبديل حصتين في التوقيت نفسه.");
        if (errors.Count > 0) return errors;

        var moved = lessons.Select(slot => slot.EntryId == entryA
            ? slot with { Period = right.Period }
            : slot.EntryId == entryB
                ? slot with { Period = left.Period }
                : slot).ToList();

        foreach (var group in moved.GroupBy(slot => (slot.TeacherId, slot.Period)).Where(group => group.Count() > 1))
        {
            errors.Add($"سيصبح أحد المعلمين في حصتين في الوقت نفسه (الحصة {group.Key.Period}).");
        }
        foreach (var group in moved.GroupBy(slot => (slot.ClassId, slot.Period)).Where(group => group.Count() > 1))
        {
            errors.Add($"سيصبح أحد الفصول لديه حصتين في الوقت نفسه (الحصة {group.Key.Period}).");
        }
        return errors;
    }

    /// <summary>
    /// Requester lesson moves into the counterparty period; counterparty lesson is cancelled that day.
    /// The input list is not modified.
    /// </summary>
    public static IReadOnlyList<string> CheckTake(
        IReadOnlyList<LessonSlot> lessons,
        long entryA,
        long entryB,
        long teacherA,
        long teacherB)
    {
        var errors = new List<string>();
        if (entryA == entryB) errors.Add("اختر حصتين مختلفتين.");
        if (teacherA == teacherB) errors.Add("لا يمكن أخذ الحصة من نفس المعلم.");

        var left = lessons.FirstOrDefault(slot => slot.EntryId == entryA);
        var right = lessons.FirstOrDefault(slot => slot.EntryId == entryB);
        if (left == null || right == null)
        {
            errors.Add("إحدى الحصتين غير موجودة في جدول هذا اليوم.");
            return errors;
        }
        if (left.TeacherId != teacherA) errors.Add("الحصة المختارة لا تخص المعلم مقدّم الطلب.");
        if (right.TeacherId != teacherB) errors.Add("الحصة المختارة لا تخص المعلم الآخر.");
        if (left.Period == right.Period) errors.Add("لا يمكن أخذ حصة في التوقيت نفسه.");
        if (errors.Count > 0) return errors;

        var moved = lessons
            .Where(slot => slot.EntryId != entryB)
            .Select(slot => slot.EntryId == entryA ? slot with { Period = right.Period } : slot)
            .ToList();

        foreach (var group in moved.GroupBy(slot => (slot.TeacherId, slot.Period)).Where(group => group.Count() > 1))
        {
            errors.Add($"سيصبح أحد المعلمين في حصتين في الوقت نفسه (الحصة {group.Key.Period}).");
        }
        foreach (var group in moved.GroupBy(slot => (slot.ClassId, slot.Period)).Where(group => group.Count() > 1))
        {
            errors.Add($"سيصبح أحد الفصول لديه حصتين في الوقت نفسه (الحصة {group.Key.Period}).");
        }
        return errors;
    }

    public static string StatusLabel(ClassSwapStatus status) => status switch
    {
        ClassSwapStatus.PendingTeacherApproval => "بانتظار موافقة المعلم",
        ClassSwapStatus.PendingDepartmentHeadApproval => "بانتظار موافقة رئيس الشعبة",
        ClassSwapStatus.PendingAdministrationApproval => "بانتظار موافقة الإدارة",
        ClassSwapStatus.Approved => "معتمد - جاهز للتنفيذ",
        ClassSwapStatus.Rejected => "مرفوض",
        ClassSwapStatus.Executed => "تم تنفيذ التبديل",
        ClassSwapStatus.Cancelled => "ملغي",
        _ => status.ToString()
    };
}
