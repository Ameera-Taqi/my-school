using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class SchoolClassService
{
    private readonly AppDbContext _db;

    public SchoolClassService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<SchoolClassDto>> FindByStageIdAsync(long stageId)
    {
        if (!await _db.AcademicStages.AnyAsync(s => s.Id == stageId))
        {
            throw new NotFoundException("المرحلة الدراسية غير موجودة");
        }
        var classes = await _db.SchoolClasses
            .Include(c => c.AcademicStage)
            .Where(c => c.AcademicStageId == stageId)
            .OrderBy(c => c.Name)
            .ToListAsync();
        var result = new List<SchoolClassDto>();
        foreach (var schoolClass in classes)
        {
            result.Add(EntityMapper.ToSchoolClassDto(schoolClass, await CountStudentsAsync(schoolClass.Id)));
        }
        return result;
    }

    public async Task<SchoolClassDto> FindByIdAsync(long classId)
    {
        var schoolClass = await RequireAsync(classId);
        return EntityMapper.ToSchoolClassDto(schoolClass, await CountStudentsAsync(classId));
    }

    public async Task<SchoolClassDto> CreateAsync(long stageId, SchoolClassDto dto)
    {
        var stage = await _db.AcademicStages.FindAsync(stageId)
            ?? throw new NotFoundException("المرحلة الدراسية غير موجودة");
        var schoolClass = new SchoolClass
        {
            Name = dto.Name ?? string.Empty,
            Capacity = dto.Capacity ?? 30,
            Notes = dto.Notes,
            AcademicStageId = stage.Id,
            AcademicStage = stage
        };
        _db.SchoolClasses.Add(schoolClass);
        await _db.SaveChangesAsync();
        return EntityMapper.ToSchoolClassDto(schoolClass, 0);
    }

    public async Task<SchoolClassDto> UpdateAsync(long classId, SchoolClassDto dto)
    {
        var schoolClass = await RequireAsync(classId);
        schoolClass.Name = dto.Name ?? schoolClass.Name;
        if (dto.Capacity.HasValue)
        {
            schoolClass.Capacity = dto.Capacity.Value;
        }
        schoolClass.Notes = dto.Notes;
        await _db.SaveChangesAsync();
        return EntityMapper.ToSchoolClassDto(schoolClass, await CountStudentsAsync(classId));
    }

    public async Task DeleteAsync(long classId)
    {
        var schoolClass = await RequireAsync(classId);
        if (await CountStudentsAsync(classId) > 0)
        {
            throw new AppException("لا يمكن حذف فصل يحتوي على طلاب");
        }
        _db.SchoolClasses.Remove(schoolClass);
        await _db.SaveChangesAsync();
    }

    private Task<long> CountStudentsAsync(long classId) =>
        _db.Students.LongCountAsync(s => s.SchoolClassId == classId);

    private async Task<SchoolClass> RequireAsync(long id) =>
        await _db.SchoolClasses.Include(c => c.AcademicStage).FirstOrDefaultAsync(c => c.Id == id)
        ?? throw new NotFoundException("الفصل غير موجود");
}
