using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class RoleService
{
    private readonly AppDbContext _db;

    public RoleService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<RoleDto>> FindAllAsync() =>
        (await _db.Roles.OrderBy(r => r.Id).ToListAsync()).Select(EntityMapper.ToRoleDto).ToList();

    public async Task<RoleDto> FindByIdAsync(long id) =>
        EntityMapper.ToRoleDto(await RequireAsync(id));

    public async Task<RoleDto> CreateAsync(RoleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RoleKey))
        {
            throw new AppException("مفتاح الدور مطلوب");
        }
        if (await _db.Roles.AnyAsync(r => r.RoleKey == dto.RoleKey))
        {
            throw new AppException("مفتاح الدور موجود مسبقاً");
        }
        var role = new Role
        {
            RoleKey = dto.RoleKey,
            RoleName = dto.RoleName ?? string.Empty,
            Description = dto.Description,
            Active = dto.Active ?? true
        };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return EntityMapper.ToRoleDto(role);
    }

    public async Task<RoleDto> UpdateAsync(long id, RoleDto dto)
    {
        var role = await RequireAsync(id);
        role.RoleName = dto.RoleName ?? role.RoleName;
        role.Description = dto.Description;
        if (dto.Active.HasValue)
        {
            role.Active = dto.Active.Value;
        }
        await _db.SaveChangesAsync();
        return EntityMapper.ToRoleDto(role);
    }

    public async Task DeleteAsync(long id)
    {
        var role = await RequireAsync(id);
        var inUse = await _db.Users.AnyAsync(u => u.Roles.Any(r => r.Id == id));
        if (inUse)
        {
            throw new AppException("لا يمكن حذف دور مرتبط بمستخدمين");
        }
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
    }

    private async Task<Role> RequireAsync(long id) =>
        await _db.Roles.FindAsync(id) ?? throw new NotFoundException("الدور غير موجود");
}
