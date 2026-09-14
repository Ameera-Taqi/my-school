using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/role-permissions")]
public class RolePermissionController : ControllerBase
{
    private readonly RolePermissionService _service;

    public RolePermissionController(RolePermissionService service)
    {
        _service = service;
    }

    [HttpGet("{roleId:long}")]
    [RequirePermission(Perms.RolePermissionsManage)]
    public async Task<ActionResult<RolePermissionDto>> GetByRole(long roleId) =>
        Ok(await _service.GetRolePermissionsAsync(roleId));

    [HttpPut]
    [RequirePermission(Perms.RolePermissionsManage)]
    public async Task<ActionResult> Save([FromBody] SaveRolePermissionsRequest request)
    {
        await _service.SaveRolePermissionsAsync(request);
        return Ok(new { message = "تم حفظ الصلاحيات بنجاح" });
    }
}
