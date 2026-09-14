using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/attendance")]
public class AttendanceController : ControllerBase
{
    private readonly AttendanceService _service;
    private readonly CurrentUserService _currentUser;

    public AttendanceController(AttendanceService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("students")]
    [RequirePermission(Perms.AttendanceView, Perms.AttendanceManage, Perms.AttendanceRecordView, Perms.MyClassesView)]
    public async Task<ActionResult<List<AttendanceRecordDto>>> Students([FromQuery] long classId, [FromQuery] string date)
    {
        if (classId <= 0 || string.IsNullOrWhiteSpace(date)) throw new AppException("الفصل والتاريخ مطلوبان");
        return Ok(await _service.GetStudentAttendanceAsync(classId, date));
    }

    [HttpPut("students")]
    [RequirePermission(Perms.AttendanceManage, Perms.AttendanceRecordView)]
    public async Task<IActionResult> SaveStudents([FromBody] List<AttendanceRecordDto> records)
    {
        var user = await _currentUser.RequireUserAsync();
        await _service.SaveStudentAttendanceAsync(user, records);
        return Ok(new { message = "تم حفظ حضور الطلاب", count = records.Count });
    }

    private const string TeacherRead = Perms.AttendanceView + "," + Perms.AttendanceManage + "," + Perms.TeacherAttendanceView;

    [HttpGet("teachers")]
    [RequirePermission(TeacherRead)]
    public async Task<ActionResult<List<AttendanceRecordDto>>> Teachers([FromQuery] string date)
    {
        if (string.IsNullOrWhiteSpace(date)) throw new AppException("التاريخ مطلوب");
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.GetTeacherAttendanceAsync(user, date));
    }

    [HttpGet("teachers/scope")]
    [RequirePermission(TeacherRead)]
    public async Task<ActionResult<TeacherAttendanceScopeDto>> TeacherScope()
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.ResolveTeacherScopeAsync(user));
    }

    [HttpGet("teachers/history")]
    [RequirePermission(TeacherRead)]
    public async Task<ActionResult<List<AttendanceRecordDto>>> TeacherHistory([FromQuery] string month)
    {
        if (string.IsNullOrWhiteSpace(month)) throw new AppException("الشهر مطلوب");
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.GetTeacherHistoryAsync(user, month));
    }

    [HttpPut("teachers")]
    [RequirePermission(Perms.AttendanceManage)]
    public async Task<IActionResult> SaveTeachers([FromBody] List<AttendanceRecordDto> records)
    {
        var user = await _currentUser.RequireUserAsync();
        await _service.SaveTeacherAttendanceAsync(user, records);
        return Ok(new { message = "تم حفظ حضور المعلمين", count = records.Count });
    }

    [HttpGet("summary")]
    [RequirePermission(Perms.DashboardView, Perms.AttendanceView, Perms.AttendanceManage, Perms.KpiView, Perms.ReportsView)]
    public async Task<ActionResult<AttendanceSummaryDto>> Summary([FromQuery] string? date) =>
        Ok(await _service.GetSummaryAsync(date));
}
