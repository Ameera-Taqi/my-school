using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
public class SchoolClassController : ControllerBase
{
    private readonly SchoolClassService _service;

    public SchoolClassController(SchoolClassService service)
    {
        _service = service;
    }

    [HttpGet("api/academic-stages/{stageId:long}/classes")]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<List<SchoolClassDto>>> FindByStage(long stageId) =>
        Ok(await _service.FindByStageIdAsync(stageId));

    [HttpPost("api/academic-stages/{stageId:long}/classes")]
    [RequirePermission(Perms.ClassesCreate)]
    public async Task<ActionResult<SchoolClassDto>> Create(long stageId, [FromBody] SchoolClassDto dto)
    {
        var created = await _service.CreateAsync(stageId, dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("api/classes/{classId:long}")]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<SchoolClassDto>> FindById(long classId) => Ok(await _service.FindByIdAsync(classId));

    [HttpPut("api/classes/{classId:long}")]
    [RequirePermission(Perms.ClassesUpdate)]
    public async Task<ActionResult<SchoolClassDto>> Update(long classId, [FromBody] SchoolClassDto dto) =>
        Ok(await _service.UpdateAsync(classId, dto));

    [HttpDelete("api/classes/{classId:long}")]
    [RequirePermission(Perms.ClassesDelete)]
    public async Task<IActionResult> Delete(long classId)
    {
        await _service.DeleteAsync(classId);
        return NoContent();
    }
}
