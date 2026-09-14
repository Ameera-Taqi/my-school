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
            result.Add(EntityMapper.ToDepartmentDto(department, await CountTeachersAsync(department.Id)));
        }
        return result;
    }

    public async Task<DepartmentDto> FindByIdAsync(long id)
    {
        var department = await RequireAsync(id);
        return EntityMapper.ToDepartmentDto(department, await CountTeachersAsync(id));
    }

    public async Task<DepartmentDto> CreateAsync(DepartmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new AppException("رمز القسم مطلوب");
        }
        if (await _db.Departments.AnyAsync(d => d.Code == dto.Code))
        {
            throw new AppException("رمز القسم موجود مسبقاً");
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
        return EntityMapper.ToDepartmentDto(department, await CountTeachersAsync(id));
    }

    public async Task DeleteAsync(long id)
    {
        var department = await RequireAsync(id);
        if (await CountTeachersAsync(id) > 0)
        {
            throw new AppException("لا يمكن حذف قسم يحتوي على معلمين");
        }
        _db.Departments.Remove(department);
        await _db.SaveChangesAsync();
    }

    private Task<long> CountTeachersAsync(long departmentId) =>
        _db.Teachers.LongCountAsync(t => t.DepartmentId == departmentId);

    private async Task<Department> RequireAsync(long id) =>
        await _db.Departments.FindAsync(id) ?? throw new NotFoundException("القسم غير موجود");
}
