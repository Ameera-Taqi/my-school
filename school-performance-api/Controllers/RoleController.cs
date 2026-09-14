using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/roles")]
public class RoleController : ControllerBase
{
    private readonly RoleService _service;

    public RoleController(RoleService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.RolesRead)]
    public async Task<ActionResult<List<RoleDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.RolesRead)]
    public async Task<ActionResult<RoleDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.RolesManage)]
    public async Task<ActionResult<RoleDto>> Create([FromBody] RoleDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.RolesManage)]
    public async Task<ActionResult<RoleDto>> Update(long id, [FromBody] RoleDto dto) =>
        Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.RolesManage)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
