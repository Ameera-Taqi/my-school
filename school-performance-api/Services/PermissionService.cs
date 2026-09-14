using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>Resolves the effective permission keys for a user or role.</summary>
public class PermissionService
{
    private readonly AppDbContext _db;

    public PermissionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<HashSet<string>> GetPermissionsForUserAsync(User user)
    {
        var roleIds = user.Roles.Select(r => r.Id).ToList();
        if (roleIds.Count == 0)
        {
            return new HashSet<string>();
        }
        return await GetPermissionKeysByRoleIdsAsync(roleIds);
    }

    public async Task<bool> HasPermissionAsync(User user, string permissionKey)
    {
        var permissions = await GetPermissionsForUserAsync(user);
        return permissions.Contains(permissionKey);
    }

    public async Task<HashSet<string>> GetPermissionKeysByRoleIdsAsync(ICollection<long> roleIds)
    {
        var keys = await _db.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId) && rp.Granted)
            .Select(rp => rp.Permission.PermissionKey)
            .Distinct()
            .ToListAsync();
        return keys.ToHashSet();
    }
}
