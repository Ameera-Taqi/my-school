using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class TeacherService
{
    private readonly AppDbContext _db;

    public TeacherService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TeacherDto>> FindByDepartmentIdAsync(long departmentId)
    {
        if (!await _db.Departments.AnyAsync(d => d.Id == departmentId))
        {
            throw new NotFoundException("القسم غير موجود");
        }
        var teachers = await TeachersWithDetails()
            .Where(t => t.DepartmentId == departmentId)
            .OrderBy(t => t.FullName)
            .ToListAsync();
        return teachers.Select(EntityMapper.ToTeacherDto).ToList();
    }

    public async Task<TeacherDto> FindByIdAsync(long id) =>
        EntityMapper.ToTeacherDto(await RequireAsync(id));

    public async Task<TeacherDto> CreateAsync(long departmentId, TeacherDto dto)
    {
        var department = await _db.Departments.FindAsync(departmentId)
            ?? throw new NotFoundException("القسم غير موجود");
        if (string.IsNullOrWhiteSpace(dto.EmployeeNumber))
        {
            throw new AppException("رقم الموظف مطلوب");
        }
        if (await _db.Teachers.AnyAsync(t => t.EmployeeNumber == dto.EmployeeNumber))
        {
            throw new AppException("رقم الموظف موجود مسبقاً");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var teacher = new Teacher { DepartmentId = department.Id, Department = department };
        Apply(teacher, dto);
        _db.Teachers.Add(teacher);
        await _db.SaveChangesAsync();
        await SyncUserAccountAsync(teacher, dto.DepartmentHead == true);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return EntityMapper.ToTeacherDto(await RequireAsync(teacher.Id));
    }

    public async Task<TeacherDto> UpdateAsync(long id, TeacherDto dto)
    {
        var teacher = await RequireAsync(id);
        if (dto.EmployeeNumber != null && dto.EmployeeNumber != teacher.EmployeeNumber
            && await _db.Teachers.AnyAsync(t => t.EmployeeNumber == dto.EmployeeNumber))
        {
            throw new AppException("رقم الموظف موجود مسبقاً");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        Apply(teacher, dto);
        await SyncUserAccountAsync(teacher, dto.DepartmentHead == true);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return EntityMapper.ToTeacherDto(await RequireAsync(id));
    }

    public async Task DeleteAsync(long id)
    {
        var teacher = await _db.Teachers.FindAsync(id) ?? throw new NotFoundException("المعلم غير موجود");
        _db.Teachers.Remove(teacher);
        await _db.SaveChangesAsync();
    }

    private static void Apply(Teacher teacher, TeacherDto dto)
    {
        teacher.EmployeeNumber = dto.EmployeeNumber ?? teacher.EmployeeNumber;
        teacher.FullName = dto.FullName ?? teacher.FullName;
        teacher.Email = dto.Email;
        teacher.Phone = dto.Phone;
        teacher.Specialization = dto.Specialization;
        teacher.HireDate = dto.HireDate;
        if (dto.Active.HasValue)
        {
            teacher.Active = dto.Active.Value;
        }
    }

    private async Task SyncUserAccountAsync(Teacher teacher, bool isHead)
    {
        var roleKey = isHead ? "DEPARTMENT_HEAD" : "TEACHER";
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleKey == roleKey)
            ?? throw new NotFoundException("الدور غير موجود");

        var user = teacher.User;
        if (user == null)
        {
            user = await CreateUserForTeacherAsync(teacher, role);
            teacher.User = user;
            teacher.UserId = user.Id;
            return;
        }

        user.FullName = teacher.FullName;
        user.Email = teacher.Email;
        user.Phone = teacher.Phone;
        user.Active = teacher.Active;
        user.Roles.Clear();
        user.Roles.Add(role);
    }

    private async Task<User> CreateUserForTeacherAsync(Teacher teacher, Role role)
    {
        var username = await GenerateUsernameAsync(teacher.EmployeeNumber);
        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(username + "123"),
            FullName = teacher.FullName,
            Email = teacher.Email,
            Phone = teacher.Phone,
            Active = teacher.Active,
            Roles = new List<Role> { role }
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private async Task<string> GenerateUsernameAsync(string employeeNumber)
    {
        var baseValue = Regex.Replace(employeeNumber.ToLowerInvariant(), "[^a-z0-9]", "");
        if (string.IsNullOrWhiteSpace(baseValue))
        {
            baseValue = "teacher";
        }
        var username = baseValue;
        var suffix = 1;
        while (await _db.Users.AnyAsync(u => u.Username == username))
        {
            username = baseValue + suffix++;
        }
        return username;
    }

    private IQueryable<Teacher> TeachersWithDetails() =>
        _db.Teachers
            .Include(t => t.Department)
            .Include(t => t.User).ThenInclude(u => u!.Roles);

    private async Task<Teacher> RequireAsync(long id) =>
        await TeachersWithDetails().FirstOrDefaultAsync(t => t.Id == id)
        ?? throw new NotFoundException("المعلم غير موجود");
}
