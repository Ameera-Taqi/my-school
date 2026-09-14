using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/permissions")]
public class PermissionController : ControllerBase
{
    private readonly PermissionManagementService _service;

    public PermissionController(PermissionManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.PermissionsRead)]
    public async Task<ActionResult<List<PermissionDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.PermissionsRead)]
    public async Task<ActionResult<PermissionDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.PermissionsManage)]
    public async Task<ActionResult<PermissionDto>> Create([FromBody] PermissionDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.PermissionsManage)]
    public async Task<ActionResult<PermissionDto>> Update(long id, [FromBody] PermissionDto dto) =>
        Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.PermissionsManage)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
