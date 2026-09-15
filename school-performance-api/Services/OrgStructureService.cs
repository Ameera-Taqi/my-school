using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>
/// Builds hierarchy: مدير المدرسة → الوكلاء → الشعب → المواد → المدرسين.
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
        var teachers = await _db.Teachers
            .Include(t => t.Department)
            .Include(t => t.User)
            .ThenInclude(u => u!.Roles)
            .ToListAsync();
        var departments = await _db.Departments.OrderBy(d => d.Name).ToListAsync();
        var subjects = await _db.Subjects.Where(s => s.Active).OrderBy(s => s.Name).ToListAsync();
        var assignments = await _db.ClassSubjectAssignments
            .AsNoTracking()
            .Select(a => new { a.SubjectId, a.TeacherId })
            .Distinct()
            .ToListAsync();

        var result = new OrgStructureDto { GeneratedAt = DateTime.UtcNow };
        var placedUserIds = new HashSet<long>();
        var placedTeacherIds = new HashSet<long>();

        foreach (var user in users.Where(u => HasRole(u, "SCHOOL_MANAGER")).OrderBy(u => u.FullName))
        {
            result.Managers.Add(FromUser(user, "SCHOOL_MANAGER", teachers.FirstOrDefault(t => t.UserId == user.Id)));
            placedUserIds.Add(user.Id);
            var linked = teachers.FirstOrDefault(t => t.UserId == user.Id);
            if (linked != null) placedTeacherIds.Add(linked.Id);
        }

        var assistants = users
            .Where(u => HasRole(u, "ASSISTANT_MANAGER") && !placedUserIds.Contains(u.Id))
            .OrderBy(u => u.FullName)
            .ToList();

        foreach (var user in assistants)
        {
            var person = FromUser(user, "ASSISTANT_MANAGER", teachers.FirstOrDefault(t => t.UserId == user.Id));
            result.AssistantManagers.Add(person);
            result.AssistantBranches.Add(new OrgAssistantBranchDto { Person = person });
            placedUserIds.Add(user.Id);
            var linked = teachers.FirstOrDefault(t => t.UserId == user.Id);
            if (linked != null) placedTeacherIds.Add(linked.Id);
        }

        var deptNodes = departments.ToDictionary(
            d => d.Id,
            d => new OrgDepartmentDto { Id = d.Id, Code = d.Code, Name = d.Name, Active = d.Active });

        // Heads first
        foreach (var teacher in teachers.OrderBy(t => t.FullName))
        {
            if (placedTeacherIds.Contains(teacher.Id)) continue;
            if (teacher.UserId != null && placedUserIds.Contains(teacher.UserId.Value)) continue;

            var isHead = teacher.User != null && teacher.User.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD"));
            if (!isHead) continue;

            var node = FromTeacher(teacher, "DEPARTMENT_HEAD");
            if (teacher.UserId != null) placedUserIds.Add(teacher.UserId.Value);
            placedTeacherIds.Add(teacher.Id);

            var deptId = teacher.DepartmentId ?? ResolveDepartmentFromRole(teacher.User!);
            if (deptId != null && deptNodes.TryGetValue(deptId.Value, out var dept) && dept.Head == null)
            {
                dept.Head = node;
            }
            else if (deptId != null && deptNodes.TryGetValue(deptId.Value, out var dept2))
            {
                dept2.Teachers.Add(node);
            }
            else
            {
                result.UnassignedHeads.Add(node);
            }
        }

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

        // Subjects under departments
        foreach (var subject in subjects.Where(s => s.DepartmentId != null))
        {
            if (!deptNodes.TryGetValue(subject.DepartmentId!.Value, out var dept)) continue;
            dept.Subjects.Add(new OrgSubjectDto
            {
                Id = subject.Id,
                Name = subject.Name,
                Code = subject.Code,
                Color = subject.Color
            });
        }

        var teachersBySubject = assignments
            .GroupBy(a => a.SubjectId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.TeacherId).ToHashSet());

        // Place teachers under matching subjects
        foreach (var teacher in teachers.OrderBy(t => t.FullName))
        {
            if (placedTeacherIds.Contains(teacher.Id)) continue;
            if (teacher.UserId != null && placedUserIds.Contains(teacher.UserId.Value)) continue;

            var node = FromTeacher(teacher, "TEACHER");
            if (teacher.UserId != null) placedUserIds.Add(teacher.UserId.Value);
            placedTeacherIds.Add(teacher.Id);

            if (teacher.DepartmentId == null || !deptNodes.TryGetValue(teacher.DepartmentId.Value, out var dept))
            {
                result.UnassignedTeachers.Add(node);
                continue;
            }

            var subject = dept.Subjects.FirstOrDefault(s =>
                teachersBySubject.TryGetValue(s.Id, out var ids) && ids.Contains(teacher.Id));

            subject ??= dept.Subjects.FirstOrDefault(s =>
                !string.IsNullOrWhiteSpace(teacher.Specialization)
                && (s.Name.Contains(teacher.Specialization, StringComparison.OrdinalIgnoreCase)
                    || teacher.Specialization.Contains(s.Name, StringComparison.OrdinalIgnoreCase)));

            if (subject != null)
            {
                subject.Teachers.Add(node);
            }
            else
            {
                dept.Teachers.Add(node);
            }
        }

        // Distribute departments under VP branches (round-robin)
        var orderedDepts = deptNodes.Values.OrderBy(d => d.Name).ToList();
        result.Departments = orderedDepts;

        if (result.AssistantBranches.Count > 0)
        {
            for (var i = 0; i < orderedDepts.Count; i++)
            {
                result.AssistantBranches[i % result.AssistantBranches.Count].Departments.Add(orderedDepts[i]);
            }
        }

        result.TotalPeople = result.Managers.Count
            + result.AssistantManagers.Count
            + result.UnassignedHeads.Count
            + result.UnassignedTeachers.Count
            + result.Departments.Sum(d =>
                (d.Head == null ? 0 : 1)
                + d.Teachers.Count
                + d.Subjects.Sum(s => s.Teachers.Count));

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
        RoleName = teacher.User?.Roles.FirstOrDefault(r => r.RoleKey.StartsWith(roleKey))?.RoleName
                   ?? (roleKey == "DEPARTMENT_HEAD" ? "رئيس شعبة" : "معلم"),
        Email = teacher.Email,
        Phone = teacher.Phone,
        Specialization = teacher.Specialization,
        EmployeeNumber = teacher.EmployeeNumber,
        Active = teacher.Active && (teacher.User?.Active ?? true)
    };
}
