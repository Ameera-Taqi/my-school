using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/class-swaps")]
public class ClassSwapController : ControllerBase
{
    private const string Read = Perms.ClassSwapView;
    private readonly ClassSwapService _service;

    public ClassSwapController(ClassSwapService service)
    {
        _service = service;
    }

    [HttpGet] [RequirePermission(Read)]
    public async Task<ActionResult<ClassSwapListResponse>> List([FromQuery] string? view) => Ok(await _service.ListAsync(view));

    [HttpGet("{id:long}")] [RequirePermission(Read)]
    public async Task<ActionResult<ClassSwapDetailDto>> Detail(long id) => Ok(await _service.DetailAsync(id));

    [HttpGet("teachers")] [RequirePermission(Perms.ClassSwapRequest)]
    public async Task<ActionResult<List<ClassSwapTeacherOptionDto>>> Teachers() => Ok(await _service.TeachersAsync());

    [HttpGet("timetable")] [RequirePermission(Read)]
    public async Task<ActionResult<List<ClassSwapLessonDto>>> Timetable([FromQuery] DateOnly date, [FromQuery] long teacherId) =>
        Ok(await _service.TimetableAsync(date, teacherId));

    [HttpPost("validate")] [RequirePermission(Perms.ClassSwapRequest)]
    public async Task<ActionResult<ClassSwapPreviewDto>> Validate([FromBody] CreateClassSwapRequest request) =>
        Ok(await _service.ValidateAsync(request));

    [HttpPost] [RequirePermission(Perms.ClassSwapRequest)]
    public async Task<ActionResult<ClassSwapDetailDto>> Create([FromBody] CreateClassSwapRequest request) =>
        StatusCode(201, await _service.CreateAsync(request));

    [HttpPost("{id:long}/approve")] [RequirePermission(Read)]
    public async Task<ActionResult<ClassSwapDetailDto>> Approve(long id, [FromBody] ClassSwapCommentRequest? body) =>
        Ok(await _service.ApproveAsync(id, body));

    [HttpPost("{id:long}/reject")] [RequirePermission(Read)]
    public async Task<ActionResult<ClassSwapDetailDto>> Reject(long id, [FromBody] ClassSwapCommentRequest? body) =>
        Ok(await _service.RejectAsync(id, body));

    [HttpPost("{id:long}/cancel")] [RequirePermission(Perms.ClassSwapRequest)]
    public async Task<ActionResult<ClassSwapDetailDto>> Cancel(long id) => Ok(await _service.CancelAsync(id));

    [HttpGet("{id:long}/execution-preview")] [RequirePermission(Perms.ClassSwapExecute)]
    public async Task<ActionResult<ClassSwapPreviewDto>> ExecutionPreview(long id) => Ok(await _service.ExecutionPreviewAsync(id));

    [HttpPost("{id:long}/execute")] [RequirePermission(Perms.ClassSwapExecute)]
    public async Task<ActionResult<ClassSwapDetailDto>> Execute(long id) => Ok(await _service.ExecuteAsync(id));

    [HttpGet("notices")] [RequirePermission(Read)]
    public async Task<ActionResult<List<ClassSwapNoticeDto>>> Notices() => Ok(await _service.MyNoticesAsync());

    [HttpPost("notices/{id:long}/read")] [RequirePermission(Read)]
    public async Task<IActionResult> ReadNotice(long id)
    {
        await _service.MarkNoticeReadAsync(id);
        return NoContent();
    }
}
