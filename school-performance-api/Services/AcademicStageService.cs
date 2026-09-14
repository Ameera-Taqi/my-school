using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class AcademicStageService
{
    private readonly AppDbContext _db;

    public AcademicStageService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AcademicStageDto>> FindAllAsync()
    {
        var stages = await _db.AcademicStages.OrderBy(s => s.Id).ToListAsync();
        var result = new List<AcademicStageDto>();
        foreach (var stage in stages)
        {
            result.Add(await ToDtoAsync(stage));
        }
        return result;
    }

    public async Task<AcademicStageDto> FindByIdAsync(long id) =>
        await ToDtoAsync(await RequireAsync(id));

    public async Task<AcademicStageDto> CreateAsync(AcademicStageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new AppException("رمز المرحلة مطلوب");
        }
        if (await _db.AcademicStages.AnyAsync(s => s.Code == dto.Code))
        {
            throw new AppException("رمز المرحلة موجود مسبقاً");
        }
        var stage = new AcademicStage
        {
            Name = dto.Name ?? string.Empty,
            Code = dto.Code,
            Description = dto.Description
        };
        _db.AcademicStages.Add(stage);
        await _db.SaveChangesAsync();
        return EntityMapper.ToAcademicStageDto(stage, 0, 0);
    }

    public async Task<AcademicStageDto> UpdateAsync(long id, AcademicStageDto dto)
    {
        var stage = await RequireAsync(id);
        stage.Name = dto.Name ?? stage.Name;
        stage.Description = dto.Description;
        await _db.SaveChangesAsync();
        return await ToDtoAsync(stage);
    }

    public async Task DeleteAsync(long id)
    {
        var stage = await RequireAsync(id);
        if (await _db.SchoolClasses.AnyAsync(c => c.AcademicStageId == id))
        {
            throw new AppException("لا يمكن حذف مرحلة تحتوي على فصول");
        }
        _db.AcademicStages.Remove(stage);
        await _db.SaveChangesAsync();
    }

    private async Task<AcademicStageDto> ToDtoAsync(AcademicStage stage)
    {
        var classCount = await _db.SchoolClasses.LongCountAsync(c => c.AcademicStageId == stage.Id);
        var studentCount = await _db.Students.LongCountAsync(s => s.SchoolClass.AcademicStageId == stage.Id);
        return EntityMapper.ToAcademicStageDto(stage, classCount, studentCount);
    }

    private async Task<AcademicStage> RequireAsync(long id) =>
        await _db.AcademicStages.FindAsync(id) ?? throw new NotFoundException("المرحلة الدراسية غير موجودة");
}
