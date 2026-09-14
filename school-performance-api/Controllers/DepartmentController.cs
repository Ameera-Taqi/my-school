using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/departments")]
public class DepartmentController : ControllerBase
{
    private readonly DepartmentService _service;

    public DepartmentController(DepartmentService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.StaffRead)]
    public async Task<ActionResult<List<DepartmentDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.StaffRead)]
    public async Task<ActionResult<DepartmentDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.DepartmentsManage)]
    public async Task<ActionResult<DepartmentDto>> Create([FromBody] DepartmentDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.DepartmentsManage)]
    public async Task<ActionResult<DepartmentDto>> Update(long id, [FromBody] DepartmentDto dto) =>
        Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.DepartmentsManage)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
