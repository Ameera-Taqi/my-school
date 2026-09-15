using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
public class TeacherController : ControllerBase
{
    private readonly TeacherService _service;

    public TeacherController(TeacherService service)
    {
        _service = service;
    }

    [HttpGet("api/teachers")]
    [RequirePermission(Perms.StaffRead)]
    public async Task<ActionResult<List<TeacherDto>>> FindAll() =>
        Ok(await _service.FindAllAsync());

    [HttpGet("api/departments/{departmentId:long}/teachers")]
    [RequirePermission(Perms.StaffRead)]
    public async Task<ActionResult<List<TeacherDto>>> FindByDepartment(long departmentId) =>
        Ok(await _service.FindByDepartmentIdAsync(departmentId));

    [HttpPost("api/departments/{departmentId:long}/teachers")]
    [RequirePermission(Perms.TeachersManage)]
    public async Task<ActionResult<TeacherDto>> Create(long departmentId, [FromBody] TeacherDto dto)
    {
        var created = await _service.CreateAsync(departmentId, dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("api/teachers/{teacherId:long}")]
    [RequirePermission(Perms.StaffRead)]
    public async Task<ActionResult<TeacherDto>> FindById(long teacherId) => Ok(await _service.FindByIdAsync(teacherId));

    [HttpPut("api/teachers/{teacherId:long}")]
    [RequirePermission(Perms.TeachersManage)]
    public async Task<ActionResult<TeacherDto>> Update(long teacherId, [FromBody] TeacherDto dto) =>
        Ok(await _service.UpdateAsync(teacherId, dto));

    [HttpDelete("api/teachers/{teacherId:long}")]
    [RequirePermission(Perms.TeachersManage)]
    public async Task<IActionResult> Delete(long teacherId)
    {
        await _service.DeleteAsync(teacherId);
        return NoContent();
    }
}
