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

    /// <summary>Class periods (1–7) that already have a saved attendance row on this date.</summary>
    public async Task<List<AttendanceSlotDto>> SubmittedPeriodSlotsAsync(string dateValue)
    {
        var date = ParseDate(dateValue);
        var slots = await _db.Attendances
            .Where(a => a.AttendanceDate == date && a.Period >= 1 && a.Period <= 7)
            .Select(a => new { ClassId = a.Student.SchoolClassId, a.Period })
            .Distinct()
            .ToListAsync();
        return slots.Select(s => new AttendanceSlotDto { ClassId = s.ClassId, Period = s.Period }).ToList();
    }

    /// <summary>
    /// Every student in the class with the saved status for one slot, or PRESENT by default.
    /// Period 0 is the daily record. Periods 1–7 are teaching periods and do not replace the daily record.
    /// The daily read also returns teacher absences and lateness for the same day.
    /// </summary>
    public async Task<List<AttendanceRecordDto>> GetStudentAttendanceAsync(long classId, string dateValue, int period = 0)
    {
        var date = ParseDate(dateValue);
        period = NormalizePeriod(period);
        var schoolClass = await _db.SchoolClasses.Include(c => c.AcademicStage).FirstOrDefaultAsync(c => c.Id == classId)
            ?? throw new NotFoundException("الفصل غير موجود");

        var students = await _db.Students.Where(s => s.SchoolClassId == classId).OrderBy(s => s.FullName).ToListAsync();
        var studentIds = students.Select(s => s.Id).ToList();
        var savedQuery = _db.Attendances
            .Where(a => a.AttendanceDate == date && a.Period == period && studentIds.Contains(a.StudentId));
        if (period >= 1) savedQuery = savedQuery.Include(a => a.WingEditedBy);
        var saved = await savedQuery.ToDictionaryAsync(a => a.StudentId);

        var periodMarks = period == 0
            ? await PeriodMarksAsync(classId, date, studentIds)
            : new Dictionary<long, List<PeriodAttendanceMarkDto>>();

        return students.Select(s =>
        {
            saved.TryGetValue(s.Id, out var record);
            periodMarks.TryGetValue(s.Id, out var marks);
            return new AttendanceRecordDto
            {
                Id = record?.Id,
                PersonId = s.Id,
                PersonName = s.FullName,
                PersonType = "STUDENT",
                StageName = schoolClass.AcademicStage.Name,
                ClassName = schoolClass.Name,
                Date = dateValue[..10],
                Period = period,
                Status = (record?.Status ?? AttendanceStatus.PRESENT).ToString(),
                PeriodMarks = marks ?? new List<PeriodAttendanceMarkDto>(),
                LateTime = record?.Status == AttendanceStatus.LATE ? record.LateTime?.ToString("HH:mm") : null,
                Notes = record?.Notes,
                WingSupervisorName = record?.WingEditedBy?.FullName
            };
        }).ToList();
    }

    /// <summary>Absent or late marks teachers recorded in periods 1–7, with the subject of that slot.</summary>
    private async Task<Dictionary<long, List<PeriodAttendanceMarkDto>>> PeriodMarksAsync(long classId, DateOnly date, List<long> studentIds)
    {
        var rows = await _db.Attendances
            .Where(a => a.AttendanceDate == date && studentIds.Contains(a.StudentId) && a.Period >= 1 && a.Period <= 7
                && (a.Status == AttendanceStatus.ABSENT || a.Status == AttendanceStatus.LATE))
            .ToListAsync();
        if (rows.Count == 0) return new Dictionary<long, List<PeriodAttendanceMarkDto>>();

        var day = (int)date.DayOfWeek;
        var subjects = await _db.ScheduleEntries
            .Where(e => e.SchoolClassId == classId && e.Day == day)
            .Include(e => e.Subject)
            .ToDictionaryAsync(e => e.Period, e => e.Subject.Name);

        return rows.GroupBy(a => a.StudentId).ToDictionary(
            g => g.Key,
            g => g.OrderBy(a => a.Period).Select(a => new PeriodAttendanceMarkDto
            {
                Period = a.Period,
                Status = a.Status.ToString(),
                Subject = subjects.GetValueOrDefault(a.Period)
            }).ToList());
    }


    public async Task SaveStudentAttendanceAsync(User user, List<AttendanceRecordDto> records)
    {
        if (records.Count == 0) return;
        var isWingSupervisor = user.Roles.Any(r => r.RoleKey == "WING_SUPERVISOR");
        var parsed = records.Select(r => (Record: r, Date: ParseDate(r.Date), Period: NormalizePeriod(r.Period))).ToList();
        foreach (var group in parsed.GroupBy(x => (x.Date, x.Period)))
        {
            var ids = group.Select(x => x.Record.PersonId).Distinct().ToList();
            var existing = await _db.Attendances
                .Where(a => a.AttendanceDate == group.Key.Date && a.Period == group.Key.Period && ids.Contains(a.StudentId))
                .ToDictionaryAsync(a => a.StudentId);
            var validIds = (await _db.Students.Where(s => ids.Contains(s.Id)).Select(s => s.Id).ToListAsync()).ToHashSet();

            foreach (var item in group)
            {
                var r = item.Record;
                if (!validIds.Contains(r.PersonId)) continue;
                var status = ParseStatus(r.Status);
                if (existing.TryGetValue(r.PersonId, out var row))
                {
                    var changed = row.Status != status;
                    var lateTime = LateStamp(status, r.LateTime, row);
                    row.Status = status;
                    row.LateTime = lateTime;
                    row.Notes = r.Notes;
                    row.RecordedById = user.Id;
                    if (isWingSupervisor && group.Key.Period >= 1 && changed)
                        row.WingEditedById = user.Id;
                }
                else
                {
                    _db.Attendances.Add(new Attendance
                    {
                        StudentId = r.PersonId,
                        AttendanceDate = group.Key.Date,
                        Period = group.Key.Period,
                        Status = status,
                        LateTime = LateStamp(status, r.LateTime, null),
                        Notes = r.Notes,
                        RecordedById = user.Id,
                        WingEditedById = isWingSupervisor && group.Key.Period >= 1 && status != AttendanceStatus.PRESENT ? user.Id : null
                    });
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
        var rows = await _db.Attendances.Where(a => a.AttendanceDate == date && a.Period == 0).GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        int Count(AttendanceStatus s) => rows.FirstOrDefault(r => r.Status == s)?.Count ?? 0;

        var present = Count(AttendanceStatus.PRESENT);
        var late = Count(AttendanceStatus.LATE);
        var absent = Count(AttendanceStatus.ABSENT);
        var recorded = rows.Sum(r => r.Count);

        var teachersTotal = await _db.Teachers.CountAsync(t => t.Active);
        var teacherRows = await _db.TeacherAttendances.Where(a => a.AttendanceDate == date).GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        int TeacherCount(AttendanceStatus s) => teacherRows.FirstOrDefault(r => r.Status == s)?.Count ?? 0;
        var teachersPresent = TeacherCount(AttendanceStatus.PRESENT);
        var teachersLate = TeacherCount(AttendanceStatus.LATE);
        var teachersAbsent = TeacherCount(AttendanceStatus.ABSENT);
        var teachersRecorded = teacherRows.Sum(r => r.Count);

        static double? Pct(int part, int whole, int recordedCount) =>
            recordedCount == 0 || whole == 0 ? null : Math.Round(part * 100.0 / whole, 1);

        return new AttendanceSummaryDto
        {
            Date = date.ToString("yyyy-MM-dd"),
            StudentsTotal = total,
            Recorded = recorded,
            Present = present,
            Absent = absent,
            Late = late,
            Excused = Count(AttendanceStatus.EXCUSED),
            Rate = Pct(present + late, total, recorded),
            AbsentRate = Pct(absent, total, recorded),
            TeachersTotal = teachersTotal,
            TeachersRecorded = teachersRecorded,
            TeachersPresent = teachersPresent,
            TeachersAbsent = teachersAbsent,
            TeachersLate = teachersLate,
            TeachersExcused = TeacherCount(AttendanceStatus.EXCUSED),
            TeacherRate = Pct(teachersPresent + teachersLate, teachersTotal, teachersRecorded),
            TeacherAbsentRate = Pct(teachersAbsent, teachersTotal, teachersRecorded)
        };
    }

    private static DateOnly ParseDate(string value)
    {
        var raw = value.Length >= 10 ? value[..10] : value;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : throw new AppException("التاريخ غير صحيح، استخدم YYYY-MM-DD");
    }

    /// <summary>Keeps the time of the late mark. Any other status clears it.</summary>
    private static TimeOnly? LateStamp(AttendanceStatus status, string? sent, Attendance? existing)
    {
        if (status != AttendanceStatus.LATE) return null;
        var parsed = ParseTime(sent, "وقت التأخر");
        if (parsed != null) return parsed;
        if (existing?.Status == AttendanceStatus.LATE && existing.LateTime != null) return existing.LateTime;
        return TimeOnly.FromDateTime(DateTime.Now);
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

    /// <summary>0 is the daily record. 1–7 are teaching periods.</summary>
    private static int NormalizePeriod(int period) =>
        period is >= 0 and <= 7 ? period : throw new AppException("رقم الحصة غير صحيح");

    /// <summary>School clock is UTC+3 (Kuwait), matching the bell times.</summary>
    private static DateTime SchoolNow() => DateTime.UtcNow.AddHours(3);

    /// <summary>Once half a period has passed, remind the subject teacher if attendance is still missing. One reminder per slot.</summary>
    public async Task SweepHalfPeriodRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = SchoolNow();
        var day = (int)now.DayOfWeek;
        if (day > 4) return;
        var due = BellPeriods.Where(p => now.TimeOfDay.TotalMinutes >= p.HalfMinute).Select(p => p.Period).ToHashSet();
        if (due.Count == 0) return;

        var date = DateOnly.FromDateTime(now);
        var entries = await _db.ScheduleEntries
            .Include(e => e.SchoolClass)
            .Include(e => e.Subject)
            .Where(e => e.Day == day && due.Contains(e.Period))
            .ToListAsync(cancellationToken);
        if (entries.Count == 0) return;

        var submitted = await _db.Attendances
            .Where(a => a.AttendanceDate == date && a.Period >= 1 && a.Period <= 7)
            .Select(a => new { a.Student.SchoolClassId, a.Period })
            .Distinct()
            .ToListAsync(cancellationToken);
        var submittedKeys = submitted.Select(s => (s.SchoolClassId, s.Period)).ToHashSet();
        var existing = await _db.AttendanceReminders
            .Where(r => r.AttendanceDate == date)
            .Select(r => new { r.SchoolClassId, r.Period })
            .ToListAsync(cancellationToken);
        var existingKeys = existing.Select(r => (r.SchoolClassId, r.Period)).ToHashSet();

        foreach (var entry in entries)
        {
            var key = (entry.SchoolClassId, entry.Period);
            if (submittedKeys.Contains(key) || existingKeys.Contains(key)) continue;
            _db.AttendanceReminders.Add(NewReminder(entry, date, "AUTO"));
        }
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Wing supervisor asks the subject teacher of this slot to submit attendance now.</summary>
    public async Task<AttendanceReminderDto> SendReminderAsync(long classId, int period, string dateValue)
    {
        if (period is < 1 or > 7) throw new AppException("رقم الحصة غير صحيح");
        var date = ParseDate(dateValue);
        var day = (int)date.DayOfWeek;
        if (day > 4) throw new AppException("لا توجد حصص في هذا اليوم");

        var entry = await _db.ScheduleEntries
            .Include(e => e.SchoolClass)
            .Include(e => e.Subject)
            .Include(e => e.Teacher)
            .FirstOrDefaultAsync(e => e.SchoolClassId == classId && e.Day == day && e.Period == period)
            ?? throw new NotFoundException("لا يوجد معلم لهذه الحصة");

        var submitted = await _db.Attendances.AnyAsync(a =>
            a.AttendanceDate == date && a.Period == period && a.Student.SchoolClassId == classId);
        if (submitted) throw new AppException("أرسل المعلم حضور هذه الحصة مسبقاً");

        var row = await _db.AttendanceReminders.FirstOrDefaultAsync(r =>
            r.TeacherId == entry.TeacherId && r.SchoolClassId == classId && r.Period == period && r.AttendanceDate == date);
        if (row == null)
        {
            row = NewReminder(entry, date, "SUPERVISOR");
            _db.AttendanceReminders.Add(row);
        }
        else
        {
            row.Subject = entry.Subject.Name;
            row.Message = ReminderMessage(entry, date);
            row.Source = "SUPERVISOR";
            row.ReadAt = null;
        }
        await _db.SaveChangesAsync();
        return ToReminderDto(row, entry.SchoolClass.Name, entry.Teacher.FullName);
    }

    public async Task<List<AttendanceReminderDto>> MyRemindersAsync(User user)
    {
        var teacherId = await _db.Teachers.Where(t => t.UserId == user.Id).Select(t => (long?)t.Id).FirstOrDefaultAsync();
        if (teacherId == null) return new List<AttendanceReminderDto>();
        var rows = await _db.AttendanceReminders
            .Include(r => r.SchoolClass)
            .Include(r => r.Teacher)
            .Where(r => r.TeacherId == teacherId && r.ReadAt == null)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();
        return rows.Select(r => ToReminderDto(r, r.SchoolClass.Name, r.Teacher.FullName)).ToList();
    }

    public async Task MarkReminderReadAsync(User user, long id)
    {
        var row = await _db.AttendanceReminders.Include(r => r.Teacher).FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException("التنبيه غير موجود");
        if (row.Teacher.UserId != user.Id) throw new AppException("ليس لديك صلاحية لتنفيذ هذا الإجراء");
        row.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static AttendanceReminder NewReminder(ScheduleEntry entry, DateOnly date, string source) => new()
    {
        TeacherId = entry.TeacherId,
        SchoolClassId = entry.SchoolClassId,
        Period = entry.Period,
        AttendanceDate = date,
        Subject = entry.Subject.Name,
        Message = ReminderMessage(entry, date),
        Source = source
    };

    private static string ReminderMessage(ScheduleEntry entry, DateOnly date) =>
        $"لم يُرسل حضور الحصة {entry.Period} ({entry.Subject.Name}) لفصل {entry.SchoolClass.Name} بتاريخ {date:yyyy-MM-dd}. يرجى إرسال تسجيل الحضور.";

    private static AttendanceReminderDto ToReminderDto(AttendanceReminder row, string className, string teacherName) => new()
    {
        Id = row.Id,
        ClassId = row.SchoolClassId,
        ClassName = className,
        Period = row.Period,
        Subject = row.Subject,
        Date = row.AttendanceDate.ToString("yyyy-MM-dd"),
        Message = row.Message,
        TeacherName = teacherName,
        Source = row.Source
    };

    /// <summary>Official bell, in minutes from midnight. HalfMinute is the midpoint of the period.</summary>
    private static readonly (int Period, double HalfMinute)[] BellPeriods =
    {
        (1, Half(7, 55, 8, 40)),
        (2, Half(8, 45, 9, 30)),
        (3, Half(9, 35, 10, 20)),
        (4, Half(10, 35, 11, 20)),
        (5, Half(11, 25, 12, 10)),
        (6, Half(12, 20, 13, 5)),
        (7, Half(13, 10, 13, 55))
    };

    private static double Half(int startHour, int startMinute, int endHour, int endMinute)
    {
        var start = startHour * 60 + startMinute;
        var end = endHour * 60 + endMinute;
        return start + (end - start) / 2.0;
    }
}
