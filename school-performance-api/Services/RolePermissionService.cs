using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class RolePermissionService
{
    private readonly AppDbContext _db;

    public RolePermissionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<RolePermissionDto> GetRolePermissionsAsync(long roleId)
    {
        var role = await _db.Roles.FindAsync(roleId) ?? throw new NotFoundException("الدور غير موجود");

        var grantedIds = (await _db.RolePermissions
                .Where(rp => rp.RoleId == roleId && rp.Granted)
                .Select(rp => rp.PermissionId)
                .ToListAsync())
            .ToHashSet();

        var allPermissions = await _db.Permissions
            .OrderBy(p => p.ModuleName).ThenBy(p => p.PermissionName)
            .ToListAsync();

        var byModule = new Dictionary<string, List<PermissionAssignmentDto>>();
        foreach (var permission in allPermissions)
        {
            if (!byModule.TryGetValue(permission.ModuleName, out var list))
            {
                list = new List<PermissionAssignmentDto>();
                byModule[permission.ModuleName] = list;
            }
            list.Add(new PermissionAssignmentDto
            {
                PermissionId = permission.Id,
                PermissionKey = permission.PermissionKey,
                PermissionName = permission.PermissionName,
                ModuleName = permission.ModuleName,
                Granted = grantedIds.Contains(permission.Id)
            });
        }

        return new RolePermissionDto
        {
            RoleId = role.Id,
            RoleName = role.RoleName,
            PermissionsByModule = byModule
        };
    }

    public async Task SaveRolePermissionsAsync(SaveRolePermissionsRequest request)
    {
        if (request.RoleId == null)
        {
            throw new AppException("الدور مطلوب");
        }
        var role = await _db.Roles.FindAsync(request.RoleId.Value) ?? throw new NotFoundException("الدور غير موجود");

        var requestedIds = (request.PermissionIds ?? new HashSet<long?>())
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();

        var existing = await _db.RolePermissions.Where(rp => rp.RoleId == role.Id).ToListAsync();
        var existingByPermissionId = existing
            .GroupBy(rp => rp.PermissionId)
            .ToDictionary(g => g.Key, g => g.First());

        var toRemove = existing.Where(rp => !requestedIds.Contains(rp.PermissionId)).ToList();
        if (toRemove.Count > 0)
        {
            _db.RolePermissions.RemoveRange(toRemove);
        }

        foreach (var permissionId in requestedIds)
        {
            if (existingByPermissionId.TryGetValue(permissionId, out var current))
            {
                current.Granted = true;
                continue;
            }

            var permission = await _db.Permissions.FindAsync(permissionId)
                ?? throw new NotFoundException($"الصلاحية غير موجودة: {permissionId}");
            _db.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id,
                Granted = true
            });
        }

        await _db.SaveChangesAsync();
    }
}
