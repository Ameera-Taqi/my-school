using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/calendar/events")]
public class CalendarEventController : ControllerBase
{
    private readonly CalendarEventService _service;
    private readonly CurrentUserService _currentUser;

    public CalendarEventController(CalendarEventService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission(Perms.CalendarView)]
    public async Task<ActionResult<List<CalendarEventDto>>> FindEvents([FromQuery] string? month)
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.FindEventsForUserAsync(user, month));
    }

    [HttpPost]
    [RequirePermission(Perms.CalendarPersonalCreate, Perms.CalendarPublicCreate, Perms.MeetingsCreate)]
    public async Task<ActionResult<CalendarEventDto>> Create([FromBody] CalendarEventRequest request)
    {
        var user = await _currentUser.RequireUserAsync();
        var created = await _service.CreateAsync(user, request);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{eventId:long}")]
    [RequirePermission(Perms.CalendarPersonalManage, Perms.CalendarPublicManage, Perms.MeetingsCreate)]
    public async Task<ActionResult<CalendarEventDto>> Update(long eventId, [FromBody] CalendarEventRequest request)
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.UpdateAsync(user, eventId, request));
    }

    [HttpDelete("{eventId:long}")]
    [RequirePermission(Perms.CalendarPersonalManage, Perms.CalendarPublicManage, Perms.MeetingsCreate)]
    public async Task<IActionResult> Delete(long eventId)
    {
        var user = await _currentUser.RequireUserAsync();
        await _service.DeleteAsync(user, eventId);
        return NoContent();
    }
}
