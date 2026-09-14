using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Security;

namespace SchoolPerformance.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;
    private readonly PermissionService _permissionService;
    private readonly DepartmentHeadScopeService _scopeService;

    public AuthService(AppDbContext db, JwtTokenService jwt, PermissionService permissionService, DepartmentHeadScopeService scopeService)
    {
        _db = db;
        _jwt = jwt;
        _permissionService = permissionService;
        _scopeService = scopeService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException("اسم المستخدم أو كلمة المرور غير صحيحة", StatusCodes.Status401Unauthorized);
        }
        if (!user.Active)
        {
            throw new AppException("الحساب غير مفعّل", StatusCodes.Status401Unauthorized);
        }
        return await BuildLoginResponseAsync(user, _jwt.GenerateToken(user));
    }

    public async Task<LoginResponse> BuildLoginResponseAsync(User user, string? token)
    {
        var scope = await _scopeService.ResolveForUserAsync(user);
        var response = new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Roles = user.Roles.Select(r => r.RoleKey).ToHashSet(),
            RoleNames = user.Roles.Select(r => r.RoleName).ToList(),
            Permissions = await _permissionService.GetPermissionsForUserAsync(user)
        };
        if (scope != null)
        {
            response.DepartmentId = scope.DepartmentId;
            response.DepartmentName = scope.DepartmentName;
            response.DepartmentCode = scope.DepartmentCode;
            response.DepartmentSubjects = scope.Subjects;
        }
        return response;
    }
}
