using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/academic-stages")]
public class AcademicStageController : ControllerBase
{
    private readonly AcademicStageService _service;

    public AcademicStageController(AcademicStageService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<List<AcademicStageDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.AcademicRead)]
    public async Task<ActionResult<AcademicStageDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.ClassesCreate)]
    public async Task<ActionResult<AcademicStageDto>> Create([FromBody] AcademicStageDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.ClassesUpdate)]
    public async Task<ActionResult<AcademicStageDto>> Update(long id, [FromBody] AcademicStageDto dto) =>
        Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.ClassesDelete)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
