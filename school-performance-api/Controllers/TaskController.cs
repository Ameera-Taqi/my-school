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
    private readonly CurrentUserService _currentUser;

    public TaskController(TaskService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<List<TaskDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Create([FromBody] TaskRequest request)
    {
        var user = await _currentUser.RequireUserAsync();
        return StatusCode(StatusCodes.Status201Created, await _service.CreateAsync(user, request));
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Update(long id, [FromBody] TaskRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
