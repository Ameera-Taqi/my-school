using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/teacher-monitoring")]
public class TeacherMonitoringController : ControllerBase
{
    private readonly TeacherMonitoringService _service;
    private readonly CurrentUserService _currentUser;

    public TeacherMonitoringController(TeacherMonitoringService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission(Perms.TeacherMonitoringView)]
    public async Task<ActionResult<List<TeacherMonitoringDto>>> FindAll(
        [FromQuery] string? department, [FromQuery] string? status, [FromQuery] string? search)
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.FindRecordsAsync(user, department, status, search));
    }

    [HttpGet("departments")]
    [RequirePermission(Perms.TeacherMonitoringView)]
    public async Task<ActionResult<List<string>>> FindDepartments()
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _service.FindDepartmentsAsync(user));
    }
}
