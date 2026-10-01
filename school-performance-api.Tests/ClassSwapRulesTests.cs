using SchoolPerformance.Api.Entities;
using Xunit;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Tests;

public class ClassSwapRulesTests
{
    private static ClassSwapRules.LessonSlot Slot(long id, long teacher, long schoolClass, int period) =>
        new(id, teacher, schoolClass, period);

    [Fact]
    public void ValidSwap_ExchangesPeriodsOnly()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5),
            Slot(3, 10, 300, 1)
        };
        var before = lessons.Select(slot => slot.Period).ToArray();

        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 10, 20);

        Assert.Empty(errors);
        Assert.Equal(before, lessons.Select(slot => slot.Period).ToArray());
    }

    [Fact]
    public void TeacherDoubleBooking_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5),
            Slot(3, 10, 300, 5)
        };

        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 10, 20);

        Assert.Contains(errors, error => error.Contains("المعلمين", StringComparison.Ordinal));
    }

    [Fact]
    public void ClassDoubleBooking_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5),
            Slot(3, 30, 100, 5)
        };

        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 10, 20);

        Assert.Contains(errors, error => error.Contains("الفصول", StringComparison.Ordinal));
    }

    [Fact]
    public void SameTeacher_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot> { Slot(1, 10, 100, 2), Slot(2, 10, 200, 5) };
        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 10, 10);
        Assert.Contains(errors, error => error.Contains("نفس المعلم", StringComparison.Ordinal));
    }

    [Fact]
    public void WrongOwner_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot> { Slot(1, 10, 100, 2), Slot(2, 20, 200, 5) };
        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 99, 20);
        Assert.Contains(errors, error => error.Contains("لا تخص", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidTake_MovesRequesterAndCancelsCounterparty()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5),
            Slot(3, 10, 300, 1)
        };

        var errors = ClassSwapRules.CheckTake(lessons, 1, 2, 10, 20);

        Assert.Empty(errors);
        Assert.Equal(2, lessons.First(slot => slot.EntryId == 1).Period);
        Assert.Equal(5, lessons.First(slot => slot.EntryId == 2).Period);
    }

    [Fact]
    public void Take_TeacherDoubleBooking_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5),
            Slot(3, 10, 300, 5)
        };

        var errors = ClassSwapRules.CheckTake(lessons, 1, 2, 10, 20);

        Assert.Contains(errors, error => error.Contains("المعلمين", StringComparison.Ordinal));
    }

    [Fact]
    public void Take_FreesRequesterOriginalPeriod()
    {
        var lessons = new List<ClassSwapRules.LessonSlot>
        {
            Slot(1, 10, 100, 2),
            Slot(2, 20, 200, 5)
        };

        Assert.Empty(ClassSwapRules.CheckTake(lessons, 1, 2, 10, 20));
    }

    [Fact]
    public void KindLabel_AndParse()
    {
        Assert.Equal("تبديل مقابل", ClassSwapRules.KindLabel(ClassSwapKind.Exchange));
        Assert.Equal("أخذ دون مقابل", ClassSwapRules.KindLabel(ClassSwapKind.TakeOnly));
        Assert.True(ClassSwapRules.TryParseKind("TakeOnly", out var kind));
        Assert.Equal(ClassSwapKind.TakeOnly, kind);
        Assert.False(ClassSwapRules.TryParseKind("Nope", out _));
    }

    [Fact]
    public void SamePeriod_IsRejected()
    {
        var lessons = new List<ClassSwapRules.LessonSlot> { Slot(1, 10, 100, 2), Slot(2, 20, 200, 2) };
        var errors = ClassSwapRules.CheckSwap(lessons, 1, 2, 10, 20);
        Assert.NotEmpty(errors);
    }

    [Fact]
    public void PastDate_IsRejected()
    {
        var today = new DateOnly(2026, 10, 1);
        Assert.NotNull(ClassSwapRules.DateProblem(today.AddDays(-1), today, false));
    }

    [Fact]
    public void Weekend_IsRejected()
    {
        var friday = new DateOnly(2026, 10, 2);
        Assert.Equal(DayOfWeek.Friday, friday.DayOfWeek);
        Assert.NotNull(ClassSwapRules.DateProblem(friday, new DateOnly(2026, 10, 1), false));
    }

    [Fact]
    public void Holiday_IsRejected()
    {
        var sunday = new DateOnly(2026, 10, 4);
        Assert.NotNull(ClassSwapRules.DateProblem(sunday, new DateOnly(2026, 10, 1), true));
    }

    [Fact]
    public void SchoolSunday_IsAccepted()
    {
        var sunday = new DateOnly(2026, 10, 4);
        Assert.Equal(0, ClassSwapRules.SchoolDayIndex(sunday));
        Assert.Null(ClassSwapRules.DateProblem(sunday, new DateOnly(2026, 10, 1), false));
    }

    [Fact]
    public void SameDepartment_RequiresOneHead()
    {
        var departments = ClassSwapRules.RequiredDepartments(4, 4);
        Assert.Equal([4L], departments);
    }

    [Fact]
    public void DifferentDepartments_RequireBothHeads()
    {
        var departments = ClassSwapRules.RequiredDepartments(4, 9);
        Assert.Equal([4L, 9L], departments);
    }

    [Fact]
    public void MissingDepartment_CannotStart()
    {
        Assert.Throws<InvalidOperationException>(() => ClassSwapRules.RequiredDepartments(4, null));
    }

    [Fact]
    public void Cancel_IsAllowedOnlyWhilePending()
    {
        Assert.True(ClassSwapRules.CanCancel(ClassSwapStatus.PendingTeacherApproval));
        Assert.True(ClassSwapRules.CanCancel(ClassSwapStatus.PendingDepartmentHeadApproval));
        Assert.True(ClassSwapRules.CanCancel(ClassSwapStatus.PendingAdministrationApproval));
        Assert.False(ClassSwapRules.CanCancel(ClassSwapStatus.Approved));
        Assert.False(ClassSwapRules.CanCancel(ClassSwapStatus.Executed));
        Assert.False(ClassSwapRules.CanCancel(ClassSwapStatus.Rejected));
    }

    [Fact]
    public void OpenStatuses_IncludeApprovedButNotExecuted()
    {
        Assert.True(ClassSwapRules.IsOpen(ClassSwapStatus.Approved));
        Assert.True(ClassSwapRules.IsOpen(ClassSwapStatus.PendingAdministrationApproval));
        Assert.False(ClassSwapRules.IsOpen(ClassSwapStatus.Executed));
        Assert.False(ClassSwapRules.IsOpen(ClassSwapStatus.Rejected));
        Assert.False(ClassSwapRules.IsOpen(ClassSwapStatus.Cancelled));
    }

    [Fact]
    public void WeeklyDayIndex_MatchesDotNetSunday()
    {
        Assert.Equal(0, ClassSwapRules.SchoolDayIndex(new DateOnly(2026, 10, 4)));
        Assert.Equal("الأحد", ClassSwapRules.DayLabel(0));
        Assert.Equal("07:55–08:40", ClassSwapRules.PeriodRange(1));
    }
}
