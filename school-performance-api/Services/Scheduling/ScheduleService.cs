using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services.Scheduling;

public class ScheduleService
{
    public static readonly string[] DayKeys = { "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY" };
    public static readonly string[] DayLabels = { "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس" };

    private readonly AppDbContext _db;
    private readonly SchedulerEngine _engine = new();

    public ScheduleService(AppDbContext db)
    {
        _db = db;
    }

    // ---------------- Subjects ----------------

    public async Task<List<SubjectDto>> GetSubjectsAsync() =>
        (await _db.Subjects.OrderBy(s => s.Name).ToListAsync()).Select(ToDto).ToList();

    public async Task<SubjectDto> CreateSubjectAsync(SubjectDto dto)
    {
        var name = dto.Name.Trim();
        if (await _db.Subjects.AnyAsync(s => s.Name == name)) throw new AppException("المادة موجودة مسبقاً");
        var subject = new Subject { Name = name, Code = dto.Code?.Trim(), Color = dto.Color, Active = dto.Active ?? true };
        _db.Subjects.Add(subject);
        await _db.SaveChangesAsync();
        return ToDto(subject);
    }

    public async Task<SubjectDto> UpdateSubjectAsync(long id, SubjectDto dto)
    {
        var subject = await _db.Subjects.FindAsync(id) ?? throw new NotFoundException("المادة غير موجودة");
        var name = dto.Name.Trim();
        if (await _db.Subjects.AnyAsync(s => s.Name == name && s.Id != id)) throw new AppException("المادة موجودة مسبقاً");
        subject.Name = name;
        subject.Code = dto.Code?.Trim();
        subject.Color = dto.Color;
        if (dto.Active.HasValue) subject.Active = dto.Active.Value;
        await _db.SaveChangesAsync();
        return ToDto(subject);
    }

    public async Task DeleteSubjectAsync(long id)
    {
        var subject = await _db.Subjects.FindAsync(id) ?? throw new NotFoundException("المادة غير موجودة");
        if (await _db.ClassSubjectAssignments.AnyAsync(a => a.SubjectId == id)) throw new AppException("لا يمكن حذف مادة مستخدمة في تكليفات الفصول");
        _db.Subjects.Remove(subject);
        await _db.SaveChangesAsync();
    }

    // ---------------- Assignments ----------------

    public async Task<List<AssignmentDto>> GetAssignmentsAsync(long? classId)
    {
        var query = _db.ClassSubjectAssignments.Include(a => a.SchoolClass).Include(a => a.Subject).Include(a => a.Teacher).AsQueryable();
        if (classId != null) query = query.Where(a => a.SchoolClassId == classId);
        var list = await query.OrderBy(a => a.SchoolClass.Name).ThenBy(a => a.Subject.Name).ToListAsync();
        var scheduled = await _db.ScheduleEntries
            .GroupBy(e => new { e.SchoolClassId, e.SubjectId, e.TeacherId })
            .Select(g => new { g.Key.SchoolClassId, g.Key.SubjectId, g.Key.TeacherId, Count = g.Count() })
            .ToListAsync();
        return list.Select(a =>
        {
            var dto = ToDto(a);
            dto.Scheduled = scheduled.FirstOrDefault(s => s.SchoolClassId == a.SchoolClassId && s.SubjectId == a.SubjectId && s.TeacherId == a.TeacherId)?.Count ?? 0;
            return dto;
        }).ToList();
    }

    public async Task<AssignmentDto> CreateAssignmentAsync(AssignmentDto dto)
    {
        await ValidateAssignmentAsync(dto, null);
        var a = new ClassSubjectAssignment { SchoolClassId = dto.ClassId, SubjectId = dto.SubjectId, TeacherId = dto.TeacherId, PeriodsPerWeek = dto.PeriodsPerWeek };
        _db.ClassSubjectAssignments.Add(a);
        await _db.SaveChangesAsync();
        return (await GetAssignmentsAsync(dto.ClassId)).First(x => x.Id == a.Id);
    }

    public async Task<AssignmentDto> UpdateAssignmentAsync(long id, AssignmentDto dto)
    {
        var a = await _db.ClassSubjectAssignments.FindAsync(id) ?? throw new NotFoundException("التكليف غير موجود");
        dto.ClassId = a.SchoolClassId;
        await ValidateAssignmentAsync(dto, id);
        a.SubjectId = dto.SubjectId;
        a.TeacherId = dto.TeacherId;
        a.PeriodsPerWeek = dto.PeriodsPerWeek;
        await _db.SaveChangesAsync();
        return (await GetAssignmentsAsync(a.SchoolClassId)).First(x => x.Id == id);
    }

    public async Task DeleteAssignmentAsync(long id)
    {
        var a = await _db.ClassSubjectAssignments.FindAsync(id) ?? throw new NotFoundException("التكليف غير موجود");
        var lessons = await _db.ScheduleEntries.Where(e => e.SchoolClassId == a.SchoolClassId && e.SubjectId == a.SubjectId && e.TeacherId == a.TeacherId).ToListAsync();
        _db.ScheduleEntries.RemoveRange(lessons);
        _db.ClassSubjectAssignments.Remove(a);
        await _db.SaveChangesAsync();
    }

    private async Task ValidateAssignmentAsync(AssignmentDto dto, long? excludeId)
    {
        if (!await _db.SchoolClasses.AnyAsync(c => c.Id == dto.ClassId)) throw new NotFoundException("الفصل غير موجود");
        if (!await _db.Subjects.AnyAsync(s => s.Id == dto.SubjectId)) throw new NotFoundException("المادة غير موجودة");
        if (!await _db.Teachers.AnyAsync(t => t.Id == dto.TeacherId)) throw new NotFoundException("المعلم غير موجود");
        if (dto.PeriodsPerWeek < 1 || dto.PeriodsPerWeek > SchedulerInput.Slots) throw new AppException("عدد الحصص الأسبوعية غير صحيح");
        if (await _db.ClassSubjectAssignments.AnyAsync(a => a.SchoolClassId == dto.ClassId && a.SubjectId == dto.SubjectId && a.Id != excludeId))
            throw new AppException("هذه المادة مضافة لهذا الفصل مسبقاً");
        var total = await _db.ClassSubjectAssignments.Where(a => a.SchoolClassId == dto.ClassId && a.Id != excludeId).SumAsync(a => a.PeriodsPerWeek);
        if (total + dto.PeriodsPerWeek > SchedulerInput.Slots)
            throw new AppException($"مجموع حصص الفصل سيتجاوز {SchedulerInput.Slots} حصة أسبوعياً (الحالي {total})");
    }

    // ---------------- Teacher constraints ----------------

    public async Task<List<TeacherConstraintDto>> GetConstraintsAsync(long? teacherId)
    {
        var query = _db.TeacherConstraints.Include(c => c.Teacher).AsQueryable();
        if (teacherId != null) query = query.Where(c => c.TeacherId == teacherId);
        return (await query.OrderBy(c => c.Teacher.FullName).ThenBy(c => c.Type).ThenBy(c => c.Day).ThenBy(c => c.Period).ToListAsync()).Select(ToDto).ToList();
    }

    public async Task<TeacherConstraintDto> CreateConstraintAsync(TeacherConstraintDto dto)
    {
        if (!await _db.Teachers.AnyAsync(t => t.Id == dto.TeacherId)) throw new NotFoundException("المعلم غير موجود");
        if (!Enum.TryParse<TeacherConstraintType>(dto.Type, true, out var type)) throw new AppException("نوع القيد غير صحيح");
        var day = string.IsNullOrWhiteSpace(dto.DayOfWeek) ? (int?)null : DayIndex(dto.DayOfWeek);
        switch (type)
        {
            case TeacherConstraintType.UNAVAILABLE_DAY when day == null: throw new AppException("حدد اليوم");
            case TeacherConstraintType.UNAVAILABLE_PERIOD when dto.Period is null or < 1 or > 7: throw new AppException("حدد رقم الحصة (1-7)");
            case TeacherConstraintType.UNAVAILABLE_SLOT when day == null || dto.Period is null or < 1 or > 7: throw new AppException("حدد اليوم والحصة");
            case TeacherConstraintType.MAX_PERIODS_PER_DAY when dto.Value is null or < 1 or > 7: throw new AppException("حدد الحد الأقصى للحصص في اليوم (1-7)");
        }
        var c = new TeacherConstraint { TeacherId = dto.TeacherId, Type = type, Day = day, Period = dto.Period, Value = dto.Value, Note = dto.Note?.Trim() };
        if (type is TeacherConstraintType.NO_FIRST_PERIOD or TeacherConstraintType.NO_LAST_PERIOD or TeacherConstraintType.UNAVAILABLE_PERIOD or TeacherConstraintType.MAX_PERIODS_PER_DAY) c.Day = null;
        if (type is TeacherConstraintType.NO_FIRST_PERIOD or TeacherConstraintType.NO_LAST_PERIOD or TeacherConstraintType.UNAVAILABLE_DAY or TeacherConstraintType.MAX_PERIODS_PER_DAY) c.Period = null;
        if (type != TeacherConstraintType.MAX_PERIODS_PER_DAY) c.Value = null;
        _db.TeacherConstraints.Add(c);
        await _db.SaveChangesAsync();
        return (await GetConstraintsAsync(dto.TeacherId)).First(x => x.Id == c.Id);
    }

    public async Task DeleteConstraintAsync(long id)
    {
        var c = await _db.TeacherConstraints.FindAsync(id) ?? throw new NotFoundException("القيد غير موجود");
        _db.TeacherConstraints.Remove(c);
        await _db.SaveChangesAsync();
    }

    // ---------------- Timetable entries ----------------

    public async Task<List<ScheduleEntryDto>> GetEntriesAsync(long? classId, long? teacherId)
    {
        var query = EntriesQuery();
        if (classId != null) query = query.Where(e => e.SchoolClassId == classId);
        if (teacherId != null) query = query.Where(e => e.TeacherId == teacherId);
        return (await query.OrderBy(e => e.Day).ThenBy(e => e.Period).ToListAsync()).Select(ToDto).ToList();
    }

    /// <summary>Manual placement with full conflict validation. AssignmentId null clears the slot.</summary>
    public async Task<ScheduleEntryDto?> SetSlotAsync(ScheduleSlotRequest request)
    {
        var day = DayIndex(request.DayOfWeek);
        var existing = await _db.ScheduleEntries.FirstOrDefaultAsync(e => e.SchoolClassId == request.ClassId && e.Day == day && e.Period == request.Period);

        if (request.AssignmentId == null)
        {
            if (existing != null) { _db.ScheduleEntries.Remove(existing); await _db.SaveChangesAsync(); }
            return null;
        }

        var a = await _db.ClassSubjectAssignments.Include(x => x.Teacher).Include(x => x.Subject).FirstOrDefaultAsync(x => x.Id == request.AssignmentId)
                ?? throw new NotFoundException("التكليف غير موجود");
        if (a.SchoolClassId != request.ClassId) throw new AppException("هذا التكليف لا يخص هذا الفصل");

        var clash = await _db.ScheduleEntries.Include(e => e.SchoolClass)
            .FirstOrDefaultAsync(e => e.TeacherId == a.TeacherId && e.Day == day && e.Period == request.Period && e.SchoolClassId != request.ClassId);
        if (clash != null) throw new AppException($"المعلم {a.Teacher.FullName} لديه حصة في فصل {clash.SchoolClass.Name} في نفس الوقت");

        var allowed = await BuildAllowedAsync(new[] { a.TeacherId });
        if (!allowed[a.TeacherId][day * SchedulerInput.Periods + request.Period - 1])
            throw new AppException($"هذه الخانة مخالفة لقيود المعلم {a.Teacher.FullName}");

        if (existing == null)
        {
            existing = new ScheduleEntry { SchoolClassId = request.ClassId, Day = day, Period = request.Period };
            _db.ScheduleEntries.Add(existing);
        }
        existing.SubjectId = a.SubjectId;
        existing.TeacherId = a.TeacherId;
        existing.Room = string.IsNullOrWhiteSpace(request.Room) ? null : request.Room.Trim();
        existing.Locked = request.Locked;
        await _db.SaveChangesAsync();
        return ToDto(await EntriesQuery().FirstAsync(e => e.Id == existing.Id));
    }

    public async Task DeleteEntryAsync(long id)
    {
        var e = await _db.ScheduleEntries.FindAsync(id) ?? throw new NotFoundException("الحصة غير موجودة");
        _db.ScheduleEntries.Remove(e);
        await _db.SaveChangesAsync();
    }

    public async Task<int> ClearAsync(long? classId, bool includeLocked)
    {
        var query = _db.ScheduleEntries.AsQueryable();
        if (classId != null) query = query.Where(e => e.SchoolClassId == classId);
        if (!includeLocked) query = query.Where(e => !e.Locked);
        var rows = await query.ToListAsync();
        _db.ScheduleEntries.RemoveRange(rows);
        await _db.SaveChangesAsync();
        return rows.Count;
    }

    // ---------------- Generation ----------------

    public async Task<GenerateScheduleResultDto> GenerateAsync(GenerateScheduleRequest request)
    {
        var sw = Stopwatch.StartNew();
        var assignments = await _db.ClassSubjectAssignments.Include(a => a.SchoolClass).Include(a => a.Subject).Include(a => a.Teacher).ToListAsync();
        var classIds = request.ClassIds is { Count: > 0 } ? request.ClassIds.ToHashSet() : assignments.Select(a => a.SchoolClassId).ToHashSet();
        var scope = assignments.Where(a => classIds.Contains(a.SchoolClassId)).ToList();
        if (scope.Count == 0) throw new AppException("لا توجد تكليفات (مواد ومعلمون) للفصول المحددة. أضف التكليفات أولاً.");

        var result = new GenerateScheduleResultDto { ClassesCount = classIds.Count, RequiredLessons = scope.Sum(a => a.PeriodsPerWeek) };

        foreach (var g in scope.GroupBy(a => a.SchoolClass))
        {
            var total = g.Sum(a => a.PeriodsPerWeek);
            if (total > SchedulerInput.Slots) result.Warnings.Add($"فصل {g.Key.Name}: مجموع الحصص {total} يتجاوز {SchedulerInput.Slots} خانة");
        }

        var teacherIds = assignments.Select(a => a.TeacherId).Distinct().ToList();
        var allowed = await BuildAllowedAsync(teacherIds);
        var maxPerDay = await _db.TeacherConstraints.Where(c => c.Type == TeacherConstraintType.MAX_PERIODS_PER_DAY && c.Value != null)
            .GroupBy(c => c.TeacherId).Select(g => new { TeacherId = g.Key, Max = g.Min(c => c.Value!.Value) }).ToDictionaryAsync(x => x.TeacherId, x => x.Max);

        // Lessons of other classes, and locked lessons inside the scope, stay fixed.
        var existing = await _db.ScheduleEntries.ToListAsync();
        var toRemove = existing.Where(e => classIds.Contains(e.SchoolClassId) && !(request.KeepLocked && e.Locked)).ToList();
        var fixedLessons = existing.Except(toRemove).Select(e => new FixedLesson(e.SchoolClassId, e.Day * SchedulerInput.Periods + e.Period - 1, e.SubjectId, e.TeacherId)).ToList();

        foreach (var t in assignments.GroupBy(a => a.Teacher))
        {
            var need = t.Sum(a => a.PeriodsPerWeek);
            var free = allowed[t.Key.Id].Count(x => x);
            if (need > free) result.Warnings.Add($"المعلم {t.Key.FullName}: مطلوب {need} حصة لكن المتاح حسب قيوده {free} خانة فقط");
        }

        var input = new SchedulerInput
        {
            Requirements = scope.Select(a => new LessonRequirement { AssignmentId = a.Id, ClassId = a.SchoolClassId, SubjectId = a.SubjectId, TeacherId = a.TeacherId, PeriodsPerWeek = a.PeriodsPerWeek }).ToList(),
            TeacherAllowed = allowed,
            TeacherMaxPerDay = maxPerDay,
            Fixed = fixedLessons,
            Seed = request.Seed
        };
        var output = _engine.Solve(input);

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.ScheduleEntries.RemoveRange(toRemove);
        await _db.SaveChangesAsync();
        foreach (var p in output.Placed)
        {
            _db.ScheduleEntries.Add(new ScheduleEntry { SchoolClassId = p.ClassId, Day = p.Day, Period = p.Period, SubjectId = p.SubjectId, TeacherId = p.TeacherId, Locked = false });
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        result.Success = output.Complete;
        result.PlacedLessons = output.Placed.Count + fixedLessons.Count(f => classIds.Contains(f.ClassId));
        result.Attempts = output.Attempts;
        foreach (var (assignmentId, missing) in output.Missing)
        {
            var a = scope.First(x => x.Id == assignmentId);
            var free = allowed[a.TeacherId].Count(x => x);
            var teacherNeed = assignments.Where(x => x.TeacherId == a.TeacherId).Sum(x => x.PeriodsPerWeek);
            var reason = teacherNeed > free
                ? "قيود المعلم لا تترك خانات كافية"
                : "تعارض مع حصص المعلم في فصول أخرى أو امتلاء خانات الفصل";
            result.Unplaced.Add(new UnplacedLessonDto { ClassId = a.SchoolClassId, ClassName = a.SchoolClass.Name, SubjectName = a.Subject.Name, TeacherName = a.Teacher.FullName, Missing = missing, Reason = reason });
        }
        result.DurationMs = sw.ElapsedMilliseconds;
        return result;
    }

    // ---------------- Overview / validation ----------------

    public async Task<ScheduleOverviewDto> GetOverviewAsync()
    {
        var assignments = await _db.ClassSubjectAssignments.Include(a => a.SchoolClass).Include(a => a.Teacher).ToListAsync();
        var entries = await EntriesQuery().ToListAsync();
        var classes = await _db.SchoolClasses.Include(c => c.AcademicStage).OrderBy(c => c.Name).ToListAsync();
        var allowed = await BuildAllowedAsync(assignments.Select(a => a.TeacherId).Distinct().ToList());

        var overview = new ScheduleOverviewDto
        {
            Classes = classes.Select(c => new ClassScheduleSummaryDto
            {
                ClassId = c.Id, ClassName = c.Name, StageName = c.AcademicStage.Name,
                Required = assignments.Where(a => a.SchoolClassId == c.Id).Sum(a => a.PeriodsPerWeek),
                Scheduled = entries.Count(e => e.SchoolClassId == c.Id)
            }).ToList(),
            Teachers = assignments.GroupBy(a => a.Teacher).Select(g => new TeacherLoadDto
            {
                TeacherId = g.Key.Id, TeacherName = g.Key.FullName,
                Required = g.Sum(a => a.PeriodsPerWeek),
                Scheduled = entries.Count(e => e.TeacherId == g.Key.Id),
                AvailableSlots = allowed.TryGetValue(g.Key.Id, out var arr) ? arr.Count(x => x) : SchedulerInput.Slots
            }).OrderBy(t => t.TeacherName).ToList()
        };

        foreach (var g in entries.GroupBy(e => new { e.TeacherId, e.Day, e.Period }).Where(g => g.Count() > 1))
        {
            var first = g.First();
            overview.Conflicts.Add(new ScheduleConflictDto { Type = "DOUBLE_BOOKED", TeacherId = g.Key.TeacherId, DayOfWeek = DayKeys[g.Key.Day], Period = g.Key.Period,
                Message = $"{first.Teacher.FullName} في فصلين في نفس الوقت: {string.Join("، ", g.Select(e => e.SchoolClass.Name))}" });
        }
        foreach (var e in entries)
        {
            if (allowed.TryGetValue(e.TeacherId, out var arr) && !arr[e.Day * SchedulerInput.Periods + e.Period - 1])
            {
                overview.Conflicts.Add(new ScheduleConflictDto { Type = "CONSTRAINT", TeacherId = e.TeacherId, ClassId = e.SchoolClassId, DayOfWeek = DayKeys[e.Day], Period = e.Period,
                    Message = $"{e.Teacher.FullName}: حصة {e.Period} يوم {DayLabels[e.Day]} في فصل {e.SchoolClass.Name} تخالف قيوده" });
            }
        }
        return overview;
    }

    // ---------------- helpers ----------------

    private async Task<Dictionary<long, bool[]>> BuildAllowedAsync(ICollection<long> teacherIds)
    {
        var ids = teacherIds.Distinct().ToList();
        var constraints = await _db.TeacherConstraints.Where(c => ids.Contains(c.TeacherId)).ToListAsync();
        var map = ids.ToDictionary(t => t, _ => Enumerable.Repeat(true, SchedulerInput.Slots).ToArray());
        foreach (var c in constraints)
        {
            var arr = map[c.TeacherId];
            for (var slot = 0; slot < SchedulerInput.Slots; slot++)
            {
                var day = slot / SchedulerInput.Periods;
                var period = slot % SchedulerInput.Periods + 1;
                var blocked = c.Type switch
                {
                    TeacherConstraintType.UNAVAILABLE_DAY => c.Day == day,
                    TeacherConstraintType.UNAVAILABLE_PERIOD => c.Period == period,
                    TeacherConstraintType.UNAVAILABLE_SLOT => c.Day == day && c.Period == period,
                    TeacherConstraintType.NO_FIRST_PERIOD => period == 1,
                    TeacherConstraintType.NO_LAST_PERIOD => period == SchedulerInput.Periods,
                    _ => false
                };
                if (blocked) arr[slot] = false;
            }
        }
        return map;
    }

    public static int DayIndex(string key)
    {
        var idx = Array.IndexOf(DayKeys, key.Trim().ToUpperInvariant());
        return idx >= 0 ? idx : throw new AppException("اليوم غير صحيح");
    }

    private IQueryable<ScheduleEntry> EntriesQuery() =>
        _db.ScheduleEntries.Include(e => e.SchoolClass).Include(e => e.Subject).Include(e => e.Teacher);

    private static SubjectDto ToDto(Subject s) => new() { Id = s.Id, Name = s.Name, Code = s.Code, Color = s.Color, Active = s.Active };

    private static AssignmentDto ToDto(ClassSubjectAssignment a) => new()
    {
        Id = a.Id, ClassId = a.SchoolClassId, ClassName = a.SchoolClass?.Name, SubjectId = a.SubjectId, SubjectName = a.Subject?.Name, SubjectColor = a.Subject?.Color,
        TeacherId = a.TeacherId, TeacherName = a.Teacher?.FullName, PeriodsPerWeek = a.PeriodsPerWeek
    };

    private static TeacherConstraintDto ToDto(TeacherConstraint c) => new()
    {
        Id = c.Id, TeacherId = c.TeacherId, TeacherName = c.Teacher?.FullName, Type = c.Type.ToString(),
        DayOfWeek = c.Day == null ? null : DayKeys[c.Day.Value], Period = c.Period, Value = c.Value, Note = c.Note,
        Description = Describe(c)
    };

    private static string Describe(TeacherConstraint c) => c.Type switch
    {
        TeacherConstraintType.UNAVAILABLE_DAY => $"غير متاح يوم {DayLabels[c.Day ?? 0]}",
        TeacherConstraintType.UNAVAILABLE_PERIOD => $"غير متاح في الحصة {c.Period} كل يوم",
        TeacherConstraintType.UNAVAILABLE_SLOT => $"غير متاح يوم {DayLabels[c.Day ?? 0]} الحصة {c.Period}",
        TeacherConstraintType.NO_FIRST_PERIOD => "لا يُسند له الحصة الأولى",
        TeacherConstraintType.NO_LAST_PERIOD => "لا يُسند له الحصة الأخيرة",
        TeacherConstraintType.MAX_PERIODS_PER_DAY => $"بحد أقصى {c.Value} حصص في اليوم",
        _ => c.Type.ToString()
    };

    private static ScheduleEntryDto ToDto(ScheduleEntry e) => new()
    {
        Id = e.Id, ClassId = e.SchoolClassId, ClassName = e.SchoolClass.Name, DayOfWeek = DayKeys[e.Day], Period = e.Period,
        SubjectId = e.SubjectId, Subject = e.Subject.Name, SubjectColor = e.Subject.Color, TeacherId = e.TeacherId, TeacherName = e.Teacher.FullName, Room = e.Room, Locked = e.Locked
    };
}
