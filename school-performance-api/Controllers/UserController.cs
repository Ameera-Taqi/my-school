using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly UserService _service;

    public UserController(UserService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.UsersView, Perms.UsersManage)]
    public async Task<ActionResult<List<UserDto>>> FindAll() => Ok(await _service.FindAllAsync());

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.UsersView, Perms.UsersManage)]
    public async Task<ActionResult<UserDto>> FindById(long id) => Ok(await _service.FindByIdAsync(id));

    [HttpPost]
    [RequirePermission(Perms.UsersManage)]
    public async Task<ActionResult<UserDto>> Create([FromBody] UserRequest request)
    {
        var created = await _service.CreateAsync(request);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.UsersManage)]
    public async Task<ActionResult<UserDto>> Update(long id, [FromBody] UserRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.UsersManage)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
