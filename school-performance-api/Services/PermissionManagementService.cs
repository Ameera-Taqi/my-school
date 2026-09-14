using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class PermissionManagementService
{
    private readonly AppDbContext _db;

    public PermissionManagementService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PermissionDto>> FindAllAsync() =>
        (await _db.Permissions.OrderBy(p => p.ModuleName).ThenBy(p => p.PermissionName).ToListAsync())
            .Select(EntityMapper.ToPermissionDto).ToList();

    public async Task<PermissionDto> FindByIdAsync(long id) =>
        EntityMapper.ToPermissionDto(await RequireAsync(id));

    public async Task<PermissionDto> CreateAsync(PermissionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PermissionKey))
        {
            throw new AppException("مفتاح الصلاحية مطلوب");
        }
        if (await _db.Permissions.AnyAsync(p => p.PermissionKey == dto.PermissionKey))
        {
            throw new AppException("مفتاح الصلاحية موجود مسبقاً");
        }
        var permission = new Permission
        {
            PermissionKey = dto.PermissionKey,
            PermissionName = dto.PermissionName ?? string.Empty,
            ModuleName = dto.ModuleName ?? string.Empty,
            Description = dto.Description,
            Active = dto.Active ?? true
        };
        _db.Permissions.Add(permission);
        await _db.SaveChangesAsync();
        return EntityMapper.ToPermissionDto(permission);
    }

    public async Task<PermissionDto> UpdateAsync(long id, PermissionDto dto)
    {
        var permission = await RequireAsync(id);
        permission.PermissionName = dto.PermissionName ?? permission.PermissionName;
        permission.ModuleName = dto.ModuleName ?? permission.ModuleName;
        permission.Description = dto.Description;
        if (dto.Active.HasValue)
        {
            permission.Active = dto.Active.Value;
        }
        await _db.SaveChangesAsync();
        return EntityMapper.ToPermissionDto(permission);
    }

    public async Task DeleteAsync(long id)
    {
        var permission = await RequireAsync(id);
        _db.Permissions.Remove(permission);
        await _db.SaveChangesAsync();
    }

    private async Task<Permission> RequireAsync(long id) =>
        await _db.Permissions.FindAsync(id) ?? throw new NotFoundException("الصلاحية غير موجودة");
}
