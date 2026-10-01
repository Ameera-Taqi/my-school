using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Services;
using Xunit;

namespace SchoolPerformance.Api.Tests;

public class RecordRulesTests
{
    [Fact]
    public void Upload_stays_draft_until_explicit_submit()
    {
        Assert.False(RecordRules.CanSubmit(RecordStatus.PendingApproval));
        Assert.True(RecordRules.CanSubmit(RecordStatus.Draft));
        Assert.Equal("مسودة", RecordRules.StatusLabel(RecordStatus.Draft, RecordApprovalLevel.None));
    }

    [Fact]
    public void Teacher_routes_to_department_head()
    {
        var route = RecordRules.RouteFor(false, false, 3, 1, out var error);
        Assert.Null(error);
        Assert.Equal(RecordApprovalLevel.Department, route!.Level);
        Assert.Equal("رئيس الشعبة", route.AuthorityLabel);
    }

    [Fact]
    public void Department_head_routes_up_not_to_self()
    {
        var route = RecordRules.RouteFor(true, false, 3, 0, out var error);
        Assert.Null(error);
        Assert.Equal(RecordApprovalLevel.Administration, route!.Level);
    }

    [Fact]
    public void School_leadership_has_no_superior()
    {
        var route = RecordRules.RouteFor(false, true, 3, 2, out var error);
        Assert.Null(route);
        Assert.Contains("لا توجد جهة", error);
    }

    [Fact]
    public void Missing_department_or_head_is_a_clear_error()
    {
        Assert.Null(RecordRules.RouteFor(false, false, null, 0, out var noDept));
        Assert.Contains("شعبة", noDept);
        Assert.Null(RecordRules.RouteFor(false, false, 3, 0, out var noHead));
        Assert.Contains("رئيس شعبة", noHead);
    }

    [Fact]
    public void Self_approval_is_blocked_and_duplicate_submit_is_blocked()
    {
        Assert.False(RecordRules.CanDecide(5, 5, true));
        Assert.False(RecordRules.CanDecide(6, 5, false));
        Assert.True(RecordRules.CanDecide(6, 5, true));
        Assert.False(RecordRules.CanSubmit(RecordStatus.PendingApproval));
        Assert.True(RecordRules.CanSubmit(RecordStatus.ReturnedForRevision));
    }

    [Fact]
    public void Rejects_empty_oversize_and_mismatched_files()
    {
        Assert.Equal("الملف فارغ.", RecordRules.FileProblem("a.pdf", []));
        Assert.Equal("حجم الملف يتجاوز 10 ميغابايت.", RecordRules.FileProblem("a.pdf", new byte[RecordRules.MaxBytes + 1]));
        Assert.Equal("نوع الملف غير مسموح.", RecordRules.FileProblem("a.exe", [1, 2, 3, 4]));
        Assert.Equal("محتوى الملف لا يطابق نوعه.", RecordRules.FileProblem("a.pdf", [1, 2, 3, 4]));
        Assert.Null(RecordRules.FileProblem("a.pdf", [0x25, 0x50, 0x44, 0x46, 0x2D]));
        Assert.True(RecordRules.CanPreview(RecordRules.ContentTypeFor("note.pdf")));
        Assert.False(RecordRules.CanPreview(RecordRules.ContentTypeFor("sheet.xlsx")));
    }

    [Fact]
    public void Returned_record_can_be_edited_and_pending_cannot()
    {
        Assert.True(RecordRules.CanEdit(RecordStatus.ReturnedForRevision));
        Assert.False(RecordRules.CanEdit(RecordStatus.PendingApproval));
        Assert.False(RecordRules.CanDelete(RecordStatus.Approved));
        Assert.True(RecordRules.CanCancel(RecordStatus.PendingApproval));
    }
}
