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
        if (!IsDigits(dto.CivilId.Trim(), 12))
        {
            throw new AppException("الرقم المدني يجب أن يتكون من 12 رقماً");
        }
        if (await _db.Students.AnyAsync(s => s.CivilId == dto.CivilId))
        {
            throw new AppException("الرقم المدني موجود مسبقاً");
        }
        if (!string.IsNullOrWhiteSpace(dto.GuardianPhone) && !IsDigits(dto.GuardianPhone.Trim(), 8))
        {
            throw new AppException("رقم ولي الأمر يجب أن يتكون من 8 أرقام");
        }
        var student = new Student { SchoolClassId = schoolClass.Id, SchoolClass = schoolClass };
        Apply(student, dto);
        _db.Students.Add(student);
        await _db.SaveChangesAsync();
        return EntityMapper.ToStudentDto(student);
    }

    public async Task<StudentImportResultDto> ImportAsync(long classId, List<StudentImportItemDto>? items)
    {
        var schoolClass = await _db.SchoolClasses.Include(c => c.AcademicStage).FirstOrDefaultAsync(c => c.Id == classId)
            ?? throw new NotFoundException("الفصل غير موجود");
        if (items == null || items.Count == 0)
        {
            throw new AppException("لا توجد بيانات لاستيرادها");
        }
        if (items.Count > 500)
        {
            throw new AppException("الحد الأقصى للاستيراد 500 طالب في الملف الواحد");
        }

        var existingCount = await _db.Students.CountAsync(s => s.SchoolClassId == classId);
        var remaining = Math.Max(0, schoolClass.Capacity - existingCount);
        var civilIdsInDb = new HashSet<string>(
            await _db.Students.Select(s => s.CivilId).ToListAsync(),
            StringComparer.OrdinalIgnoreCase);
        var seenInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var toAdd = new List<Student>();
        var result = new StudentImportResultDto();

        foreach (var item in items)
        {
            var row = item.Row > 0 ? item.Row : result.Created + result.Failed + 2;
            var civilId = (item.CivilId ?? string.Empty).Trim();
            try
            {
                var fullName = (item.FullName ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(civilId))
                {
                    throw new AppException("الرقم المدني مطلوب");
                }
                if (!IsDigits(civilId, 12))
                {
                    throw new AppException("الرقم المدني يجب أن يتكون من 12 رقماً");
                }
                if (string.IsNullOrWhiteSpace(fullName))
                {
                    throw new AppException("اسم الطالب مطلوب");
                }
                if (fullName.Length > 150)
                {
                    throw new AppException("اسم الطالب يجب ألا يتجاوز 150 حرفاً");
                }
                var phone = string.IsNullOrWhiteSpace(item.GuardianPhone) ? null : item.GuardianPhone.Trim();
                if (phone != null && !IsDigits(phone, 8))
                {
                    throw new AppException("رقم ولي الأمر يجب أن يتكون من 8 أرقام");
                }
                var notes = string.IsNullOrWhiteSpace(item.Notes) ? null : item.Notes.Trim();
                if (notes is { Length: > 500 })
                {
                    throw new AppException("الملاحظات يجب ألا تتجاوز 500 حرف");
                }
                if (!seenInFile.Add(civilId))
                {
                    throw new AppException("الرقم المدني مكرر في الملف");
                }
                if (civilIdsInDb.Contains(civilId))
                {
                    throw new AppException("الرقم المدني موجود مسبقاً");
                }
                if (toAdd.Count >= remaining)
                {
                    throw new AppException("الفصل ممتلئ ولا يمكن إضافة مزيد من الطلاب");
                }
                if (string.IsNullOrWhiteSpace(item.Gender))
                {
                    throw new AppException("الجنس مطلوب. اختر ذكر أو أنثى");
                }

                var student = new Student { SchoolClassId = schoolClass.Id, SchoolClass = schoolClass };
                Apply(student, new StudentDto
                {
                    CivilId = civilId,
                    FullName = fullName,
                    BirthDate = item.BirthDate,
                    Gender = NormalizeGender(item.Gender),
                    GuardianPhone = phone,
                    Status = NormalizeStatus(item.Status),
                    Notes = notes
                });
                toAdd.Add(student);
                civilIdsInDb.Add(civilId);
            }
            catch (AppException ex)
            {
                result.Failed++;
                result.Errors.Add(new StudentImportErrorDto
                {
                    Row = row,
                    CivilId = string.IsNullOrWhiteSpace(civilId) ? null : civilId,
                    Message = ex.Message
                });
            }
        }

        if (toAdd.Count > 0)
        {
            _db.Students.AddRange(toAdd);
            await _db.SaveChangesAsync();
        }

        result.Created = toAdd.Count;
        return result;
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

    private static string NormalizeGender(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return nameof(Gender.MALE);
        }
        var normalized = value.Trim();
        if (normalized.Equals(nameof(Gender.MALE), StringComparison.OrdinalIgnoreCase)
            || normalized is "ذكر" or "ذ" or "M" or "m")
        {
            return nameof(Gender.MALE);
        }
        if (normalized.Equals(nameof(Gender.FEMALE), StringComparison.OrdinalIgnoreCase)
            || normalized is "أنثى" or "انثى" or "أنثي" or "انثي" or "F" or "f")
        {
            return nameof(Gender.FEMALE);
        }
        throw new AppException("الجنس غير صحيح. استخدم ذكر أو أنثى");
    }

    private static string NormalizeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return nameof(StudentStatus.ACTIVE);
        }
        var normalized = value.Trim();
        if (normalized.Equals(nameof(StudentStatus.ACTIVE), StringComparison.OrdinalIgnoreCase) || normalized == "نشط")
        {
            return nameof(StudentStatus.ACTIVE);
        }
        if (normalized.Equals(nameof(StudentStatus.TRANSFERRED), StringComparison.OrdinalIgnoreCase) || normalized == "منقول")
        {
            return nameof(StudentStatus.TRANSFERRED);
        }
        if (normalized.Equals(nameof(StudentStatus.SUSPENDED), StringComparison.OrdinalIgnoreCase) || normalized == "موقوف")
        {
            return nameof(StudentStatus.SUSPENDED);
        }
        throw new AppException("حالة الطالب غير صحيحة. استخدم نشط أو منقول أو موقوف");
    }

    private static bool IsDigits(string value, int length) =>
        value.Length == length && value.All(char.IsDigit);

    private async Task<Student> RequireAsync(long id) =>
        await _db.Students.Include(s => s.SchoolClass).ThenInclude(c => c.AcademicStage).FirstOrDefaultAsync(s => s.Id == id)
        ?? throw new NotFoundException("الطالب غير موجود");
}
