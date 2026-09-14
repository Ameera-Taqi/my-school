using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services.Scheduling;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
public class ScheduleController : ControllerBase
{
    private const string Read = Perms.ClassScheduleView + "," + Perms.ClassScheduleManage + "," + Perms.MyClassesView + "," + Perms.TeachersView + "," + Perms.TeachersManage;
    private const string Write = Perms.ClassScheduleManage;

    private readonly ScheduleService _service;

    public ScheduleController(ScheduleService service)
    {
        _service = service;
    }

    // Subjects
    [HttpGet("api/subjects")] [RequirePermission(Read)]
    public async Task<ActionResult<List<SubjectDto>>> Subjects() => Ok(await _service.GetSubjectsAsync());

    [HttpPost("api/subjects")] [RequirePermission(Write)]
    public async Task<ActionResult<SubjectDto>> CreateSubject([FromBody] SubjectDto dto) => StatusCode(201, await _service.CreateSubjectAsync(dto));

    [HttpPut("api/subjects/{id:long}")] [RequirePermission(Write)]
    public async Task<ActionResult<SubjectDto>> UpdateSubject(long id, [FromBody] SubjectDto dto) => Ok(await _service.UpdateSubjectAsync(id, dto));

    [HttpDelete("api/subjects/{id:long}")] [RequirePermission(Write)]
    public async Task<IActionResult> DeleteSubject(long id) { await _service.DeleteSubjectAsync(id); return NoContent(); }

    // Assignments
    [HttpGet("api/schedule/assignments")] [RequirePermission(Read)]
    public async Task<ActionResult<List<AssignmentDto>>> Assignments([FromQuery] long? classId) => Ok(await _service.GetAssignmentsAsync(classId));

    [HttpPost("api/schedule/assignments")] [RequirePermission(Write)]
    public async Task<ActionResult<AssignmentDto>> CreateAssignment([FromBody] AssignmentDto dto) => StatusCode(201, await _service.CreateAssignmentAsync(dto));

    [HttpPut("api/schedule/assignments/{id:long}")] [RequirePermission(Write)]
    public async Task<ActionResult<AssignmentDto>> UpdateAssignment(long id, [FromBody] AssignmentDto dto) => Ok(await _service.UpdateAssignmentAsync(id, dto));

    [HttpDelete("api/schedule/assignments/{id:long}")] [RequirePermission(Write)]
    public async Task<IActionResult> DeleteAssignment(long id) { await _service.DeleteAssignmentAsync(id); return NoContent(); }

    // Teacher constraints
    [HttpGet("api/schedule/constraints")] [RequirePermission(Read)]
    public async Task<ActionResult<List<TeacherConstraintDto>>> Constraints([FromQuery] long? teacherId) => Ok(await _service.GetConstraintsAsync(teacherId));

    [HttpPost("api/schedule/constraints")] [RequirePermission(Write)]
    public async Task<ActionResult<TeacherConstraintDto>> CreateConstraint([FromBody] TeacherConstraintDto dto) => StatusCode(201, await _service.CreateConstraintAsync(dto));

    [HttpDelete("api/schedule/constraints/{id:long}")] [RequirePermission(Write)]
    public async Task<IActionResult> DeleteConstraint(long id) { await _service.DeleteConstraintAsync(id); return NoContent(); }

    // Timetable
    [HttpGet("api/schedule/entries")] [RequirePermission(Read)]
    public async Task<ActionResult<List<ScheduleEntryDto>>> Entries([FromQuery] long? classId, [FromQuery] long? teacherId) => Ok(await _service.GetEntriesAsync(classId, teacherId));

    [HttpPut("api/schedule/entries/slot")] [RequirePermission(Write)]
    public async Task<ActionResult<ScheduleEntryDto?>> SetSlot([FromBody] ScheduleSlotRequest request)
    {
        var entry = await _service.SetSlotAsync(request);
        return entry == null ? NoContent() : Ok(entry);
    }

    [HttpDelete("api/schedule/entries/{id:long}")] [RequirePermission(Write)]
    public async Task<IActionResult> DeleteEntry(long id) { await _service.DeleteEntryAsync(id); return NoContent(); }

    [HttpDelete("api/schedule/entries")] [RequirePermission(Write)]
    public async Task<ActionResult> Clear([FromQuery] long? classId, [FromQuery] bool includeLocked = false)
    {
        var count = await _service.ClearAsync(classId, includeLocked);
        return Ok(new { message = $"تم حذف {count} حصة", count });
    }

    [HttpPost("api/schedule/generate")] [RequirePermission(Write)]
    public async Task<ActionResult<GenerateScheduleResultDto>> Generate([FromBody] GenerateScheduleRequest? request) =>
        Ok(await _service.GenerateAsync(request ?? new GenerateScheduleRequest()));

    [HttpGet("api/schedule/overview")] [RequirePermission(Read)]
    public async Task<ActionResult<ScheduleOverviewDto>> Overview() => Ok(await _service.GetOverviewAsync());
}
