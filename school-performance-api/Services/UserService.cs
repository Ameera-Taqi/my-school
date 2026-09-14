using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class UserService
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissionService;

    public UserService(AppDbContext db, PermissionService permissionService)
    {
        _db = db;
        _permissionService = permissionService;
    }

    public async Task<List<UserDto>> FindAllAsync()
    {
        var users = await _db.Users.Include(u => u.Roles).OrderBy(u => u.Id).ToListAsync();
        var result = new List<UserDto>();
        foreach (var user in users)
        {
            result.Add(await ToDtoAsync(user));
        }
        return result;
    }

    public async Task<UserDto> FindByIdAsync(long id) => await ToDtoAsync(await RequireAsync(id));

    public async Task<UserDto> CreateAsync(UserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new AppException("اسم المستخدم مطلوب");
        }
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new AppException("كلمة المرور مطلوبة");
        }
        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
        {
            throw new AppException("اسم المستخدم موجود مسبقاً");
        }

        var roles = await ResolveRolesAsync(request.RoleIds);
        ValidateTeacherDepartment(roles, request.DepartmentId);

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var user = new User
        {
            Username = request.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName ?? string.Empty,
            Email = request.Email,
            Phone = request.Phone,
            Active = request.Active ?? true,
            Roles = roles
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await SyncTeacherProfileAsync(user, roles, request.DepartmentId);
        await transaction.CommitAsync();

        return await ToDtoAsync(user);
    }

    public async Task<UserDto> UpdateAsync(long id, UserRequest request)
    {
        var user = await RequireAsync(id);
        user.FullName = request.FullName ?? user.FullName;
        user.Email = request.Email;
        user.Phone = request.Phone;
        if (request.Active.HasValue)
        {
            user.Active = request.Active.Value;
        }
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        var roles = user.Roles.ToList();
        if (request.RoleIds != null)
        {
            roles = await ResolveRolesAsync(request.RoleIds);
            user.Roles.Clear();
            foreach (var role in roles)
            {
                user.Roles.Add(role);
            }
        }
        ValidateTeacherDepartment(roles, request.DepartmentId);

        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _db.SaveChangesAsync();
        await SyncTeacherProfileAsync(user, roles, request.DepartmentId);
        await transaction.CommitAsync();

        return await ToDtoAsync(user);
    }

    public async Task DeleteAsync(long id)
    {
        var user = await RequireAsync(id);
        var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == id);
        if (teacher != null)
        {
            _db.Teachers.Remove(teacher);
        }
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    private async Task<UserDto> ToDtoAsync(User user)
    {
        var teacher = await _db.Teachers.Include(t => t.Department).FirstOrDefaultAsync(t => t.UserId == user.Id);
        return EntityMapper.ToUserDto(user, await _permissionService.GetPermissionsForUserAsync(user), teacher);
    }

    private static void ValidateTeacherDepartment(ICollection<Role> roles, long? departmentId)
    {
        if (HasTeacherRole(roles) && departmentId == null)
        {
            throw new AppException("يجب تحديد الشعبة للمعلم");
        }
    }

    private async Task SyncTeacherProfileAsync(User user, ICollection<Role> roles, long? departmentId)
    {
        if (HasTeacherRole(roles))
        {
            var department = await _db.Departments.FindAsync(departmentId!.Value)
                ?? throw new NotFoundException("الشعبة غير موجودة");

            var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher == null)
            {
                teacher = new Teacher
                {
                    EmployeeNumber = await GenerateEmployeeNumberAsync(user),
                    UserId = user.Id
                };
                _db.Teachers.Add(teacher);
            }

            teacher.FullName = user.FullName;
            teacher.Email = user.Email;
            teacher.Phone = user.Phone;
            teacher.DepartmentId = department.Id;
            teacher.Active = user.Active;
            await _db.SaveChangesAsync();
            return;
        }

        var existing = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
        if (existing != null)
        {
            _db.Teachers.Remove(existing);
            await _db.SaveChangesAsync();
        }
    }

    private static bool HasTeacherRole(IEnumerable<Role> roles) =>
        roles.Any(r => r.RoleKey == "TEACHER");

    private async Task<string> GenerateEmployeeNumberAsync(User user)
    {
        var baseValue = Regex.Replace(user.Username.ToLowerInvariant(), "[^a-z0-9]", "");
        if (string.IsNullOrWhiteSpace(baseValue))
        {
            baseValue = "teacher";
        }
        var employeeNumber = "T-" + baseValue.ToUpperInvariant();
        var suffix = 1;
        while (await _db.Teachers.AnyAsync(t => t.EmployeeNumber == employeeNumber))
        {
            employeeNumber = "T-" + baseValue.ToUpperInvariant() + suffix++;
        }
        return employeeNumber;
    }

    private async Task<List<Role>> ResolveRolesAsync(HashSet<long>? roleIds)
    {
        if (roleIds == null || roleIds.Count == 0)
        {
            return new List<Role>();
        }
        return await _db.Roles.Where(r => roleIds.Contains(r.Id)).ToListAsync();
    }

    private async Task<User> RequireAsync(long id) =>
        await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id)
        ?? throw new NotFoundException("المستخدم غير موجود");
}
