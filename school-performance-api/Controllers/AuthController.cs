using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly CurrentUserService _currentUser;

    public AuthController(AuthService authService, CurrentUserService currentUser)
    {
        _authService = authService;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request) =>
        Ok(await _authService.LoginAsync(request));

    [HttpGet("me")]
    public async Task<ActionResult<LoginResponse>> Me()
    {
        var user = await _currentUser.RequireUserAsync();
        return Ok(await _authService.BuildLoginResponseAsync(user, null));
    }
}
