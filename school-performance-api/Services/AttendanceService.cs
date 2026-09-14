using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>Daily attendance for students (per class) and teachers.</summary>
public class AttendanceService
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissionService;
    private readonly DepartmentHeadScopeService _scopeService;

    public AttendanceService(AppDbContext db, PermissionService permissionService, DepartmentHeadScopeService scopeService)
    {
        _db = db;
        _permissionService = permissionService;
        _scopeService = scopeService;
    }

    /// <summary>Management sees every teacher, a department head only their department, a teacher only themselves.</summary>
    public async Task<TeacherAttendanceScopeDto> ResolveTeacherScopeAsync(User user)
    {
        var perms = await _permissionService.GetPermissionsForUserAsync(user);
        var canRecord = perms.Contains("attendance.manage");
        if (perms.Contains("attendance.view") || canRecord)
        {
            return new TeacherAttendanceScopeDto { Scope = "ALL", CanRecord = canRecord, TeachersCount = await _db.Teachers.CountAsync(t => t.Active) };
        }

        var departmentId = await _scopeService.ResolveDepartmentIdAsync(user);
        if (departmentId != null)
        {
            var dept = await _db.Departments.FindAsync(departmentId.Value);
            return new TeacherAttendanceScopeDto
            {
                Scope = "DEPARTMENT", DepartmentId = departmentId, DepartmentName = dept?.Name, CanRecord = false,
                TeachersCount = await _db.Teachers.CountAsync(t => t.Active && t.DepartmentId == departmentId)
            };
        }

        var self = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
        if (self != null)
        {
            return new TeacherAttendanceScopeDto { Scope = "SELF", TeacherId = self.Id, TeacherName = self.FullName, CanRecord = false, TeachersCount = 1 };
        }
        return new TeacherAttendanceScopeDto { Scope = "NONE" };
    }

    private async Task<List<Teacher>> ScopedTeachersAsync(TeacherAttendanceScopeDto scope)
    {
        var query = _db.Teachers.Where(t => t.Active);
        query = scope.Scope switch
        {
            "ALL" => query,
            "DEPARTMENT" => query.Where(t => t.DepartmentId == scope.DepartmentId),
            "SELF" => query.Where(t => t.Id == scope.TeacherId),
            _ => query.Where(t => false)
        };
        return await query.Include(t => t.Department).OrderBy(t => t.FullName).ToListAsync();
    }

    public async Task<List<AttendanceRecordDto>> GetTeacherAttendanceAsync(User user, string dateValue)
    {
        var date = ParseDate(dateValue);
        var scope = await ResolveTeacherScopeAsync(user);
        var teachers = await ScopedTeachersAsync(scope);
        var ids = teachers.Select(t => t.Id).ToList();
        var saved = await _db.TeacherAttendances.Where(a => a.AttendanceDate == date && ids.Contains(a.TeacherId)).ToDictionaryAsync(a => a.TeacherId);

        return teachers.Select(t =>
        {
            saved.TryGetValue(t.Id, out var record);
            return new AttendanceRecordDto
            {
                Id = record?.Id,
                PersonId = t.Id,
                PersonName = t.FullName,
                PersonType = "TEACHER",
                ClassName = t.Department?.Name,
                Date = dateValue[..10],
                Status = record?.Status.ToString() ?? "NOT_RECORDED",
                Notes = record?.Notes,
                CheckInTime = record?.CheckInTime?.ToString("HH:mm"),
                PresenceTime = record?.PresenceTime?.ToString("HH:mm"),
                CheckOutTime = record?.CheckOutTime?.ToString("HH:mm"),
                PresenceMinutes = record?.PresenceMinutes
            };
        }).ToList();
    }

    /// <summary>All saved teacher records in a month (yyyy-MM) for the caller's scope.</summary>
    public async Task<List<AttendanceRecordDto>> GetTeacherHistoryAsync(User user, string month)
    {
        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start))
            throw new AppException("صيغة الشهر غير صحيحة، استخدم YYYY-MM");
        var end = start.AddMonths(1);
        var scope = await ResolveTeacherScopeAsync(user);
        var teachers = await ScopedTeachersAsync(scope);
        var ids = teachers.Select(t => t.Id).ToList();
        var names = teachers.ToDictionary(t => t.Id, t => t);
        var rows = await _db.TeacherAttendances.Where(a => a.AttendanceDate >= start && a.AttendanceDate < end && ids.Contains(a.TeacherId))
            .OrderBy(a => a.AttendanceDate).ThenBy(a => a.TeacherId).ToListAsync();
        return rows.Select(a => new AttendanceRecordDto
        {
            Id = a.Id, PersonId = a.TeacherId, PersonName = names[a.TeacherId].FullName, PersonType = "TEACHER",
            ClassName = names[a.TeacherId].Department?.Name, Date = a.AttendanceDate.ToString("yyyy-MM-dd"), Status = a.Status.ToString(), Notes = a.Notes,
            CheckInTime = a.CheckInTime?.ToString("HH:mm"), PresenceTime = a.PresenceTime?.ToString("HH:mm"), CheckOutTime = a.CheckOutTime?.ToString("HH:mm"), PresenceMinutes = a.PresenceMinutes
        }).ToList();
    }

    /// <summary>Every student in the class with the saved status for the day, or PRESENT by default.</summary>
    public async Task<List<AttendanceRecordDto>> GetStudentAttendanceAsync(long classId, string dateValue)
    {
        var date = ParseDate(dateValue);
        var schoolClass = await _db.SchoolClasses.Include(c => c.AcademicStage).FirstOrDefaultAsync(c => c.Id == classId)
            ?? throw new NotFoundException("الفصل غير موجود");

        var students = await _db.Students.Where(s => s.SchoolClassId == classId).OrderBy(s => s.FullName).ToListAsync();
        var studentIds = students.Select(s => s.Id).ToList();
        var saved = await _db.Attendances
            .Where(a => a.AttendanceDate == date && studentIds.Contains(a.StudentId))
            .ToDictionaryAsync(a => a.StudentId);

        return students.Select(s =>
        {
            saved.TryGetValue(s.Id, out var record);
            return new AttendanceRecordDto
            {
                Id = record?.Id,
                PersonId = s.Id,
                PersonName = s.FullName,
                PersonType = "STUDENT",
                StageName = schoolClass.AcademicStage.Name,
                ClassName = schoolClass.Name,
                Date = dateValue[..10],
                Status = (record?.Status ?? AttendanceStatus.PRESENT).ToString(),
                Notes = record?.Notes
            };
        }).ToList();
    }


    public async Task SaveStudentAttendanceAsync(User user, List<AttendanceRecordDto> records)
    {
        if (records.Count == 0) return;
        var byDate = records.GroupBy(r => ParseDate(r.Date));
        foreach (var group in byDate)
        {
            var ids = group.Select(r => r.PersonId).Distinct().ToList();
            var existing = await _db.Attendances.Where(a => a.AttendanceDate == group.Key && ids.Contains(a.StudentId)).ToDictionaryAsync(a => a.StudentId);
            var validIds = (await _db.Students.Where(s => ids.Contains(s.Id)).Select(s => s.Id).ToListAsync()).ToHashSet();

            foreach (var r in group)
            {
                if (!validIds.Contains(r.PersonId)) continue;
                var status = ParseStatus(r.Status);
                if (existing.TryGetValue(r.PersonId, out var row))
                {
                    row.Status = status;
                    row.Notes = r.Notes;
                    row.RecordedById = user.Id;
                }
                else
                {
                    _db.Attendances.Add(new Attendance { StudentId = r.PersonId, AttendanceDate = group.Key, Status = status, Notes = r.Notes, RecordedById = user.Id });
                }
            }
        }
        await _db.SaveChangesAsync();
    }

    public async Task SaveTeacherAttendanceAsync(User user, List<AttendanceRecordDto> records)
    {
        if (records.Count == 0) return;
        foreach (var group in records.GroupBy(r => ParseDate(r.Date)))
        {
            var ids = group.Select(r => r.PersonId).Distinct().ToList();
            var existing = await _db.TeacherAttendances.Where(a => a.AttendanceDate == group.Key && ids.Contains(a.TeacherId)).ToDictionaryAsync(a => a.TeacherId);
            var validIds = (await _db.Teachers.Where(t => ids.Contains(t.Id)).Select(t => t.Id).ToListAsync()).ToHashSet();

            foreach (var r in group)
            {
                if (!validIds.Contains(r.PersonId)) continue;
                // Rows never touched by the recorder are skipped; a teacher stays "not recorded" until a time is punched.
                if (string.Equals(r.Status, "NOT_RECORDED", StringComparison.OrdinalIgnoreCase))
                {
                    if (existing.TryGetValue(r.PersonId, out var stale)) _db.TeacherAttendances.Remove(stale);
                    continue;
                }
                var status = ParseStatus(r.Status);
                var checkIn = ParseTime(r.CheckInTime, "وقت الحضور");
                if ((status == AttendanceStatus.PRESENT || status == AttendanceStatus.LATE) && checkIn == null)
                    throw new AppException($"لا يمكن تسجيل «{(status == AttendanceStatus.PRESENT ? "حاضر" : "متأخر")}» بدون وقت حضور (بصمة) للمعلم {r.PersonName}");
                var presence = ParseTime(r.PresenceTime, "وقت التواجد");
                var checkOut = ParseTime(r.CheckOutTime, "وقت الانصراف");
                if (checkIn != null && checkOut != null && checkOut <= checkIn)
                    throw new AppException($"وقت الانصراف يجب أن يكون بعد وقت الحضور ({r.PersonName})");
                if (presence != null && checkIn != null && presence < checkIn)
                    throw new AppException($"وقت التواجد يجب أن يكون بعد وقت الحضور ({r.PersonName})");
                if (presence != null && checkOut != null && presence > checkOut)
                    throw new AppException($"وقت التواجد يجب أن يكون قبل وقت الانصراف ({r.PersonName})");
                if (status == AttendanceStatus.ABSENT) { checkIn = null; presence = null; checkOut = null; }
                if (existing.TryGetValue(r.PersonId, out var row))
                {
                    row.Status = status;
                    row.Notes = r.Notes;
                    row.CheckInTime = checkIn;
                    row.PresenceTime = presence;
                    row.CheckOutTime = checkOut;
                    row.RecordedById = user.Id;
                }
                else
                {
                    _db.TeacherAttendances.Add(new TeacherAttendance { TeacherId = r.PersonId, AttendanceDate = group.Key, Status = status, Notes = r.Notes, CheckInTime = checkIn, PresenceTime = presence, CheckOutTime = checkOut, RecordedById = user.Id });
                }
            }
        }
        await _db.SaveChangesAsync();
    }

    public async Task<AttendanceSummaryDto> GetSummaryAsync(string? dateValue)
    {
        var date = string.IsNullOrWhiteSpace(dateValue) ? DateOnly.FromDateTime(DateTime.Today) : ParseDate(dateValue);
        var total = await _db.Students.CountAsync(s => s.Status == StudentStatus.ACTIVE);
        var rows = await _db.Attendances.Where(a => a.AttendanceDate == date).GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        int Count(AttendanceStatus s) => rows.FirstOrDefault(r => r.Status == s)?.Count ?? 0;

        var present = Count(AttendanceStatus.PRESENT);
        var late = Count(AttendanceStatus.LATE);
        var recorded = rows.Sum(r => r.Count);
        return new AttendanceSummaryDto
        {
            Date = date.ToString("yyyy-MM-dd"),
            StudentsTotal = total,
            Recorded = recorded,
            Present = present,
            Absent = Count(AttendanceStatus.ABSENT),
            Late = late,
            Excused = Count(AttendanceStatus.EXCUSED),
            Rate = recorded == 0 ? null : Math.Round((present + late) * 100.0 / recorded, 1)
        };
    }

    private static DateOnly ParseDate(string value)
    {
        var raw = value.Length >= 10 ? value[..10] : value;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : throw new AppException("التاريخ غير صحيح، استخدم YYYY-MM-DD");
    }

    private static TimeOnly? ParseTime(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var raw = value.Trim();
        if (raw.Length > 5) raw = raw[..5];
        return TimeOnly.TryParseExact(raw, new[] { "HH:mm", "H:mm" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var t)
            ? t
            : throw new AppException($"{fieldName} غير صحيح، استخدم الصيغة HH:mm");
    }

    private static AttendanceStatus ParseStatus(string value) =>
        Enum.TryParse<AttendanceStatus>(value, true, out var status) ? status : throw new AppException("حالة الحضور غير صحيحة");
}
