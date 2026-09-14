using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class StudentService
{
    private readonly AppDbContext _db;

    public StudentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<StudentDto>> FindByClassIdAsync(long classId)
    {
        if (!await _db.SchoolClasses.AnyAsync(c => c.Id == classId))
        {
            throw new NotFoundException("الفصل غير موجود");
        }
        var students = await _db.Students
            .Include(s => s.SchoolClass).ThenInclude(c => c.AcademicStage)
            .Where(s => s.SchoolClassId == classId)
            .OrderBy(s => s.FullName)
            .ToListAsync();
        return students.Select(EntityMapper.ToStudentDto).ToList();
    }

    public async Task<StudentDto> FindByIdAsync(long id) =>
        EntityMapper.ToStudentDto(await RequireAsync(id));

    public async Task<StudentDto> CreateAsync(long classId, StudentDto dto)
    {
        var schoolClass = await _db.SchoolClasses.Include(c => c.AcademicStage).FirstOrDefaultAsync(c => c.Id == classId)
            ?? throw new NotFoundException("الفصل غير موجود");
        if (string.IsNullOrWhiteSpace(dto.CivilId))
        {
            throw new AppException("الرقم المدني مطلوب");
        }
        if (await _db.Students.AnyAsync(s => s.CivilId == dto.CivilId))
        {
            throw new AppException("الرقم المدني موجود مسبقاً");
        }
        var student = new Student { SchoolClassId = schoolClass.Id, SchoolClass = schoolClass };
        Apply(student, dto);
        _db.Students.Add(student);
        await _db.SaveChangesAsync();
        return EntityMapper.ToStudentDto(student);
    }

    public async Task<StudentDto> UpdateAsync(long id, StudentDto dto)
    {
        var student = await RequireAsync(id);
        if (dto.CivilId != null && dto.CivilId != student.CivilId
            && await _db.Students.AnyAsync(s => s.CivilId == dto.CivilId))
        {
            throw new AppException("الرقم المدني موجود مسبقاً");
        }
        Apply(student, dto);
        await _db.SaveChangesAsync();
        return EntityMapper.ToStudentDto(student);
    }

    public async Task DeleteAsync(long id)
    {
        var student = await RequireAsync(id);
        _db.Students.Remove(student);
        await _db.SaveChangesAsync();
    }

    private static void Apply(Student student, StudentDto dto)
    {
        student.CivilId = dto.CivilId ?? student.CivilId;
        student.FullName = dto.FullName ?? student.FullName;
        student.BirthDate = dto.BirthDate;
        if (dto.Gender != null)
        {
            student.Gender = Enum.TryParse<Gender>(dto.Gender, true, out var gender)
                ? gender
                : throw new AppException("الجنس غير صحيح");
        }
        student.GuardianPhone = dto.GuardianPhone;
        if (dto.Status != null)
        {
            student.Status = Enum.TryParse<StudentStatus>(dto.Status, true, out var status)
                ? status
                : throw new AppException("حالة الطالب غير صحيحة");
        }
        student.Notes = dto.Notes;
    }

    private async Task<Student> RequireAsync(long id) =>
        await _db.Students.Include(s => s.SchoolClass).ThenInclude(c => c.AcademicStage).FirstOrDefaultAsync(s => s.Id == id)
        ?? throw new NotFoundException("الطالب غير موجود");
}
