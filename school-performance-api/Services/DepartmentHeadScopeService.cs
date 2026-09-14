using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class DepartmentHeadScopeService
{
    private readonly AppDbContext _db;

    public DepartmentHeadScopeService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DepartmentHeadScopeDto?> ResolveForUserAsync(User user)
    {
        if (!IsDepartmentHeadUser(user))
        {
            return null;
        }

        var departmentId = await ResolveDepartmentIdAsync(user);
        if (departmentId == null)
        {
            return null;
        }

        var department = await _db.Departments.FindAsync(departmentId.Value);
        if (department == null)
        {
            return null;
        }

        var subjects = await _db.Teachers
            .Where(t => t.DepartmentId == departmentId && t.Specialization != null && t.Specialization.Trim() != "")
            .Select(t => t.Specialization!.Trim())
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();

        return new DepartmentHeadScopeDto
        {
            DepartmentId = department.Id,
            DepartmentName = department.Name,
            DepartmentCode = department.Code,
            Subjects = subjects
        };
    }

    public async Task<long?> ResolveDepartmentIdAsync(User user)
    {
        if (!IsDepartmentHeadUser(user))
        {
            return null;
        }

        var teacherDepartmentId = await _db.Teachers
            .Where(t => t.UserId == user.Id)
            .Select(t => t.DepartmentId)
            .FirstOrDefaultAsync();
        if (teacherDepartmentId != null)
        {
            return teacherDepartmentId;
        }

        return user.Roles
            .Select(r => r.RoleKey)
            .Where(k => k.StartsWith("DEPARTMENT_HEAD_"))
            .Select(ExtractDepartmentIdFromRoleKey)
            .FirstOrDefault(id => id != null);
    }

    public bool IsDepartmentHeadUser(User user) =>
        user.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD"));

    private static long? ExtractDepartmentIdFromRoleKey(string roleKey)
    {
        var suffix = roleKey["DEPARTMENT_HEAD_".Length..];
        return long.TryParse(suffix, out var id) ? id : null;
    }
}
