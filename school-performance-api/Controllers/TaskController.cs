using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TaskController : ControllerBase
{
    private readonly TaskService _service;

    public TaskController(TaskService service)
    {
        _service = service;
    }

    [HttpGet("assignable-users")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<List<AssignableUserDto>>> AssignableUsers() =>
        Ok(await _service.AssignableUsersAsync());

    [HttpGet]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskListResponse>> List(
        [FromQuery] string? view,
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? priority) =>
        Ok(await _service.ListAsync(view, q, status, priority));

    [HttpGet("dashboard")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<List<TaskDto>>> Dashboard() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Create([FromBody] TaskRequest request) =>
        StatusCode(StatusCodes.Status201Created, await _service.CreateAsync(request));

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Update(long id, [FromBody] TaskRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpPost("{id:long}/start")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Start(long id) => Ok(await _service.StartAsync(id));

    [HttpPost("{id:long}/complete")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Complete(long id, [FromBody] TaskCommentRequest? body) =>
        Ok(await _service.CompleteAsync(id, body?.Comment));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Cancel(long id, [FromBody] TaskCommentRequest? body) =>
        Ok(await _service.CancelAsync(id, body?.Comment));

    [HttpPost("{id:long}/comments")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Comment(long id, [FromBody] TaskCommentRequest? body) =>
        Ok(await _service.CommentAsync(id, body?.Comment));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("notices")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<List<TaskNoticeDto>>> Notices() => Ok(await _service.MyNoticesAsync());

    [HttpPost("notices/{id:long}/read")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<IActionResult> ReadNotice(long id)
    {
        await _service.MarkNoticeReadAsync(id);
        return NoContent();
    }
}
