using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Security;

/// <summary>Resolves the authenticated user (with roles) and their permissions once per request.</summary>
public class CurrentUserService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly PermissionService _permissionService;
    private User? _user;
    private HashSet<string>? _permissions;

    public CurrentUserService(AppDbContext db, IHttpContextAccessor httpContextAccessor, PermissionService permissionService)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
        _permissionService = permissionService;
    }

    public string Username =>
        _httpContextAccessor.HttpContext?.User.Identity?.Name
        ?? throw new AppException("غير مصرح", StatusCodes.Status401Unauthorized);

    public async Task<User> RequireUserAsync()
    {
        if (_user != null) return _user;
        var username = Username;
        _user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Username == username)
                ?? throw new AppException("المستخدم غير موجود", StatusCodes.Status401Unauthorized);
        if (!_user.Active)
        {
            throw new AppException("الحساب غير مفعّل", StatusCodes.Status401Unauthorized);
        }
        return _user;
    }

    public async Task<HashSet<string>> GetPermissionsAsync()
    {
        if (_permissions != null) return _permissions;
        var user = await RequireUserAsync();
        _permissions = await _permissionService.GetPermissionsForUserAsync(user);
        return _permissions;
    }

    public async Task<bool> HasPermissionAsync(string key) => (await GetPermissionsAsync()).Contains(key);
}
