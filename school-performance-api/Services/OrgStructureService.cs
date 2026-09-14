using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>
/// Builds the school hierarchy from live data: users with management roles, departments with their
/// head (a teacher whose account holds a DEPARTMENT_HEAD role) and their teachers.
/// </summary>
public class OrgStructureService
{
    private readonly AppDbContext _db;

    public OrgStructureService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OrgStructureDto> BuildAsync()
    {
        var users = await _db.Users.Include(u => u.Roles).ToListAsync();
        var teachers = await _db.Teachers.Include(t => t.Department).Include(t => t.User).ThenInclude(u => u!.Roles).ToListAsync();
        var departments = await _db.Departments.OrderBy(d => d.Name).ToListAsync();

        var result = new OrgStructureDto { GeneratedAt = DateTime.UtcNow };
        var placedUserIds = new HashSet<long>();

        // Level 1 and 2: management accounts.
        foreach (var user in users.Where(u => HasRole(u, "SCHOOL_MANAGER")).OrderBy(u => u.FullName))
        {
            result.Managers.Add(FromUser(user, "SCHOOL_MANAGER", teachers.FirstOrDefault(t => t.UserId == user.Id)));
            placedUserIds.Add(user.Id);
        }
        foreach (var user in users.Where(u => HasRole(u, "ASSISTANT_MANAGER") && !placedUserIds.Contains(u.Id)).OrderBy(u => u.FullName))
        {
            result.AssistantManagers.Add(FromUser(user, "ASSISTANT_MANAGER", teachers.FirstOrDefault(t => t.UserId == user.Id)));
            placedUserIds.Add(user.Id);
        }

        // Level 3: departments with heads. Level 4: teachers.
        var deptNodes = departments.ToDictionary(d => d.Id, d => new OrgDepartmentDto { Id = d.Id, Code = d.Code, Name = d.Name, Active = d.Active });

        foreach (var teacher in teachers.OrderBy(t => t.FullName))
        {
            if (teacher.UserId != null && placedUserIds.Contains(teacher.UserId.Value))
            {
                continue; // already shown as manager/assistant
            }
            var isHead = teacher.User != null && teacher.User.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD"));
            var node = FromTeacher(teacher, isHead ? "DEPARTMENT_HEAD" : "TEACHER");
            if (teacher.UserId != null) placedUserIds.Add(teacher.UserId.Value);

            if (isHead)
            {
                var deptId = teacher.DepartmentId ?? ResolveDepartmentFromRole(teacher.User!);
                if (deptId != null && deptNodes.TryGetValue(deptId.Value, out var dept) && dept.Head == null)
                {
                    dept.Head = node;
                }
                else if (deptId != null && deptNodes.TryGetValue(deptId.Value, out var dept2))
                {
                    dept2.Teachers.Insert(0, node); // second head in same department: list under it
                }
                else
                {
                    result.UnassignedHeads.Add(node);
                }
            }
            else if (teacher.DepartmentId != null && deptNodes.TryGetValue(teacher.DepartmentId.Value, out var dept))
            {
                dept.Teachers.Add(node);
            }
            else
            {
                result.UnassignedTeachers.Add(node);
            }
        }

        // Department-head accounts without a teacher profile (role key may carry the department id).
        foreach (var user in users.Where(u => u.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD")) && !placedUserIds.Contains(u.Id)).OrderBy(u => u.FullName))
        {
            var node = FromUser(user, "DEPARTMENT_HEAD", null);
            var deptId = ResolveDepartmentFromRole(user);
            if (deptId != null && deptNodes.TryGetValue(deptId.Value, out var dept) && dept.Head == null)
            {
                dept.Head = node;
            }
            else
            {
                result.UnassignedHeads.Add(node);
            }
            placedUserIds.Add(user.Id);
        }

        result.Departments = deptNodes.Values.OrderBy(d => d.Name).ToList();
        result.TotalPeople = result.Managers.Count + result.AssistantManagers.Count + result.UnassignedHeads.Count + result.UnassignedTeachers.Count
                             + result.Departments.Sum(d => (d.Head == null ? 0 : 1) + d.Teachers.Count);
        return result;
    }

    private static bool HasRole(User user, string key) => user.Roles.Any(r => r.RoleKey == key);

    private static long? ResolveDepartmentFromRole(User user)
    {
        foreach (var key in user.Roles.Select(r => r.RoleKey).Where(k => k.StartsWith("DEPARTMENT_HEAD_")))
        {
            if (long.TryParse(key["DEPARTMENT_HEAD_".Length..], out var id)) return id;
        }
        return null;
    }

    private static OrgPersonDto FromUser(User user, string roleKey, Teacher? teacher) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Username = user.Username,
        RoleKey = roleKey,
        RoleName = user.Roles.FirstOrDefault(r => r.RoleKey == roleKey)?.RoleName ?? user.Roles.FirstOrDefault()?.RoleName ?? roleKey,
        Email = user.Email,
        Phone = user.Phone,
        Specialization = teacher?.Specialization,
        EmployeeNumber = teacher?.EmployeeNumber,
        Active = user.Active
    };

    private static OrgPersonDto FromTeacher(Teacher teacher, string roleKey) => new()
    {
        Id = teacher.Id,
        FullName = teacher.FullName,
        Username = teacher.User?.Username,
        RoleKey = roleKey,
        RoleName = teacher.User?.Roles.FirstOrDefault(r => r.RoleKey.StartsWith(roleKey))?.RoleName ?? (roleKey == "DEPARTMENT_HEAD" ? "رئيس شعبة" : "معلم"),
        Email = teacher.Email,
        Phone = teacher.Phone,
        Specialization = teacher.Specialization,
        EmployeeNumber = teacher.EmployeeNumber,
        Active = teacher.Active && (teacher.User?.Active ?? true)
    };
}
