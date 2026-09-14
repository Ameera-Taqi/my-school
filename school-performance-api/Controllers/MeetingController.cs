using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/meetings")]
public class MeetingController : ControllerBase
{
    private readonly MeetingService _service;
    private readonly CurrentUserService _currentUser;

    public MeetingController(MeetingService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission(Perms.MeetingsView, Perms.MeetingsCreate, Perms.TasksView, Perms.TasksCreate)]
    public async Task<ActionResult<List<MeetingDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.MeetingsView, Perms.MeetingsCreate)]
    public async Task<ActionResult<MeetingDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.MeetingsCreate)]
    public async Task<ActionResult<MeetingDto>> Create([FromBody] MeetingRequest request)
    {
        var user = await _currentUser.RequireUserAsync();
        return StatusCode(StatusCodes.Status201Created, await _service.CreateAsync(user, request));
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.MeetingsCreate)]
    public async Task<ActionResult<MeetingDto>> Update(long id, [FromBody] MeetingRequest request)
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.UpdateAsync(user, id, request));
    }

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.MeetingsCreate)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
