using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class DepartmentService
{
    private readonly AppDbContext _db;

    public DepartmentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<DepartmentDto>> FindAllAsync()
    {
        var departments = await _db.Departments.OrderBy(d => d.Id).ToListAsync();
        var result = new List<DepartmentDto>();
        foreach (var department in departments)
        {
            result.Add(await ToDtoAsync(department));
        }
        return result;
    }

    public async Task<DepartmentDto> FindByIdAsync(long id)
    {
        var department = await RequireAsync(id);
        return await ToDtoAsync(department);
    }

    /// <summary>Same rules the org chart uses, so both pages always agree.</summary>
    private async Task<DepartmentDto> ToDtoAsync(Department department)
    {
        var dto = EntityMapper.ToDepartmentDto(department, await CountTeachersAsync(department.Id));
        dto.HeadName = await _db.Teachers
            .Where(t => t.DepartmentId == department.Id && t.Active
                        && t.User != null && t.User.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD")))
            .OrderBy(t => t.Id)
            .Select(t => t.FullName)
            .FirstOrDefaultAsync();
        dto.Subjects = await _db.Subjects
            .Where(s => s.DepartmentId == department.Id && s.Active)
            .OrderBy(s => s.Id)
            .Select(s => s.Name)
            .ToListAsync();
        return dto;
    }

    public async Task<DepartmentDto> CreateAsync(DepartmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new AppException("رمز الشعبة مطلوب");
        }
        if (await _db.Departments.AnyAsync(d => d.Code == dto.Code))
        {
            throw new AppException("رمز الشعبة موجود مسبقاً");
        }
        var department = new Department
        {
            Code = dto.Code,
            Name = dto.Name ?? string.Empty,
            Description = dto.Description,
            Active = dto.Active ?? true
        };
        _db.Departments.Add(department);
        await _db.SaveChangesAsync();
        return EntityMapper.ToDepartmentDto(department, 0);
    }

    public async Task<DepartmentDto> UpdateAsync(long id, DepartmentDto dto)
    {
        var department = await RequireAsync(id);
        department.Name = dto.Name ?? department.Name;
        department.Description = dto.Description;
        if (dto.Active.HasValue)
        {
            department.Active = dto.Active.Value;
        }
        await _db.SaveChangesAsync();
        return await ToDtoAsync(department);
    }

    public async Task DeleteAsync(long id)
    {
        var department = await RequireAsync(id);
        if (await CountTeachersAsync(id) > 0)
        {
            throw new AppException("لا يمكن حذف شعبة تحتوي على معلمين");
        }
        _db.Departments.Remove(department);
        await _db.SaveChangesAsync();
    }

    private Task<long> CountTeachersAsync(long departmentId) =>
        _db.Teachers.LongCountAsync(t => t.DepartmentId == departmentId);

    private async Task<Department> RequireAsync(long id) =>
        await _db.Departments.FindAsync(id) ?? throw new NotFoundException("الشعبة غير موجودة");
}
