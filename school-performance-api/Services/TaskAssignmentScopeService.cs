using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>Who may assign tasks to whom, based on department-head scope and school leadership.</summary>
public class TaskAssignmentScopeService
{
    private readonly AppDbContext _db;
    private readonly DepartmentHeadScopeService _heads;

    public TaskAssignmentScopeService(AppDbContext db, DepartmentHeadScopeService heads)
    {
        _db = db;
        _heads = heads;
    }

    public bool IsLeadership(User user) =>
        user.Roles.Any(r => r.RoleKey is "SCHOOL_MANAGER" or "ASSISTANT_MANAGER" or "ADMIN");

    public bool CanAssignTasks(User user) =>
        _heads.IsDepartmentHeadUser(user) || IsLeadership(user);

    public async Task<List<AssignableUserDto>> GetAssignableUsersAsync(User assigner)
    {
        var users = await LoadCandidatesAsync(assigner);
        return users
            .Where(u => u.Id != assigner.Id && u.Active)
            .OrderBy(u => u.FullName)
            .Select(u => new AssignableUserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                RoleLabel = RoleLabel(u)
            })
            .ToList();
    }

    public async Task<bool> CanAssignToAsync(User assigner, long assigneeUserId)
    {
        if (assigneeUserId == assigner.Id) return false;
        var allowed = await GetAssignableUsersAsync(assigner);
        return allowed.Any(u => u.Id == assigneeUserId);
    }

    private async Task<List<User>> LoadCandidatesAsync(User assigner)
    {
        if (_heads.IsDepartmentHeadUser(assigner))
        {
            var departmentId = await _heads.ResolveDepartmentIdAsync(assigner);
            if (departmentId == null) return [];
            return await _db.Teachers.AsNoTracking()
                .Include(t => t.User!).ThenInclude(u => u.Roles)
                .Where(t => t.Active && t.DepartmentId == departmentId && t.UserId != null && t.User!.Active)
                .Select(t => t.User!)
                .ToListAsync();
        }

        if (IsLeadership(assigner))
        {
            var teachers = await _db.Teachers.AsNoTracking()
                .Include(t => t.User!).ThenInclude(u => u.Roles)
                .Where(t => t.Active && t.UserId != null && t.User!.Active)
                .Select(t => t.User!)
                .ToListAsync();
            var heads = await _db.Users.AsNoTracking().Include(u => u.Roles)
                .Where(u => u.Active && u.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD")))
                .ToListAsync();
            return teachers.Concat(heads).GroupBy(u => u.Id).Select(g => g.First()).ToList();
        }

        return [];
    }

    private static string RoleLabel(User user)
    {
        var roles = user.Roles.Select(r => r.RoleKey).ToList();
        if (roles.Any(r => r.StartsWith("DEPARTMENT_HEAD"))) return "رئيس الشعبة";
        if (roles.Contains("SCHOOL_MANAGER")) return "مدير المدرسة";
        if (roles.Contains("ASSISTANT_MANAGER")) return "وكيل المدرسة";
        if (roles.Contains("TEACHER")) return "المعلم";
        return "مستخدم";
    }
}
