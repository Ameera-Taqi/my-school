using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
public class StudentController : ControllerBase
{
    private readonly StudentService _service;

    public StudentController(StudentService service)
    {
        _service = service;
    }

    [HttpGet("api/classes/{classId:long}/students")]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<List<StudentDto>>> FindByClass(long classId) =>
        Ok(await _service.FindByClassIdAsync(classId));

    [HttpPost("api/classes/{classId:long}/students")]
    [RequirePermission(Perms.StudentsCreate)]
    public async Task<ActionResult<StudentDto>> Create(long classId, [FromBody] StudentDto dto)
    {
        var created = await _service.CreateAsync(classId, dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("api/students/{studentId:long}")]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<StudentDto>> FindById(long studentId) => Ok(await _service.FindByIdAsync(studentId));

    [HttpPut("api/students/{studentId:long}")]
    [RequirePermission(Perms.StudentsUpdate)]
    public async Task<ActionResult<StudentDto>> Update(long studentId, [FromBody] StudentDto dto) =>
        Ok(await _service.UpdateAsync(studentId, dto));

    [HttpDelete("api/students/{studentId:long}")]
    [RequirePermission(Perms.StudentsDelete)]
    public async Task<IActionResult> Delete(long studentId)
    {
        await _service.DeleteAsync(studentId);
        return NoContent();
    }
}
