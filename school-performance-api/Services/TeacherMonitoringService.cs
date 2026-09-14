using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>
/// Teacher monitoring records. NOTE: the performance metrics below are demo values derived
/// deterministically from the teacher id, exactly as in the original implementation. They are
/// placeholders until real classroom-visit data exists.
/// </summary>
public class TeacherMonitoringService
{
    private readonly AppDbContext _db;
    private readonly DepartmentHeadScopeService _scopeService;

    public TeacherMonitoringService(AppDbContext db, DepartmentHeadScopeService scopeService)
    {
        _db = db;
        _scopeService = scopeService;
    }

    public async Task<List<TeacherMonitoringDto>> FindRecordsAsync(User currentUser, string? department, string? status, string? search)
    {
        var teachers = await ScopedTeachersAsync(currentUser);
        var query = search?.Trim().ToLowerInvariant();

        return teachers
            .Select(ToMonitoringDto)
            .Where(dto => string.IsNullOrWhiteSpace(department) || department == dto.DepartmentName)
            .Where(dto => string.IsNullOrWhiteSpace(status) || string.Equals(status, dto.Status, StringComparison.OrdinalIgnoreCase))
            .Where(dto => string.IsNullOrWhiteSpace(query)
                          || dto.TeacherName.ToLowerInvariant().Contains(query)
                          || dto.Subject.ToLowerInvariant().Contains(query))
            .OrderBy(dto => dto.TeacherName, StringComparer.Ordinal)
            .ToList();
    }

    public async Task<List<string>> FindDepartmentsAsync(User currentUser)
    {
        var teachers = await ScopedTeachersAsync(currentUser);
        return teachers
            .Select(t => t.Department?.Name)
            .Where(name => name != null)
            .Select(name => name!)
            .Distinct()
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();
    }

    private async Task<List<Teacher>> ScopedTeachersAsync(User currentUser)
    {
        var scopedDepartmentId = await _scopeService.ResolveDepartmentIdAsync(currentUser);
        var teachers = await _db.Teachers
            .Include(t => t.Department)
            .Include(t => t.User).ThenInclude(u => u!.Roles)
            .Where(t => t.Active)
            .OrderBy(t => t.FullName)
            .ToListAsync();

        return teachers
            .Where(t => t.User == null || !_scopeService.IsDepartmentHeadUser(t.User))
            .Where(t => scopedDepartmentId == null || t.DepartmentId == scopedDepartmentId)
            .ToList();
    }

    private static TeacherMonitoringDto ToMonitoringDto(Teacher teacher)
    {
        var metrics = DeriveMetrics(teacher.Id);
        var teacherName = !string.IsNullOrWhiteSpace(teacher.User?.FullName) ? teacher.User!.FullName : teacher.FullName;
        var subject = string.IsNullOrWhiteSpace(teacher.Specialization) ? "—" : teacher.Specialization;

        return new TeacherMonitoringDto
        {
            Id = teacher.Id,
            TeacherName = teacherName,
            DepartmentName = teacher.Department?.Name ?? "—",
            Subject = subject,
            ClassesCount = metrics.ClassesCount,
            AttendanceRate = metrics.AttendanceRate,
            LessonPlanRate = metrics.LessonPlanRate,
            EvaluationScore = metrics.EvaluationScore,
            LastVisitDate = metrics.LastVisitDate.ToString("yyyy-MM-dd"),
            Status = metrics.Status,
            Strengths = DefaultStrengths(metrics.Status),
            Improvements = DefaultImprovements(metrics.Status),
            Notes = DefaultNotes(metrics.Status)
        };
    }

    private static Metrics DeriveMetrics(long teacherId)
    {
        var seed = (int)teacherId;
        var attendanceRate = 85 + (seed * 7) % 14;
        var lessonPlanRate = 60 + (seed * 11) % 40;
        var evaluationScore = Math.Round(2.5 + (seed % 23) / 10.0, 1);
        var classesCount = 3 + seed % 3;
        var lastVisitDate = DateOnly.FromDateTime(DateTime.Today).AddDays(-(seed % 28 + 1));
        var status = ResolveStatus(evaluationScore, lessonPlanRate);
        return new Metrics(classesCount, attendanceRate, lessonPlanRate, evaluationScore, lastVisitDate, status);
    }

    private static string ResolveStatus(double evaluationScore, int lessonPlanRate)
    {
        if (evaluationScore >= 4.5 && lessonPlanRate >= 90) return "EXCELLENT";
        if (evaluationScore >= 3.8) return "GOOD";
        if (evaluationScore >= 3.0) return "NEEDS_FOLLOW_UP";
        return "CRITICAL";
    }

    private static string DefaultStrengths(string status) => status switch
    {
        "EXCELLENT" => "تنويع استراتيجيات التدريس، التزام بالخطط",
        "GOOD" => "شرح واضح، إدارة صف جيدة",
        "NEEDS_FOLLOW_UP" => "تفاعل جيد مع الطلاب",
        _ => "خبرة في المادة"
    };

    private static string DefaultImprovements(string status) => status switch
    {
        "EXCELLENT" => "زيادة الأنشطة التفاعلية",
        "GOOD" => "رفع نسبة إنجاز الخطط الأسبوعية",
        "NEEDS_FOLLOW_UP" => "تسليم خطط الدروس في الوقت، توثيق الواجبات",
        _ => "الالتزام بالحضور، إعداد الدروس، متابعة الطلاب"
    };

    private static string DefaultNotes(string status) => status switch
    {
        "EXCELLENT" => "أداء متميز خلال الزيارة الصفية",
        "GOOD" => "يُنصح بمتابعة خطة الأسبوع القادم",
        "NEEDS_FOLLOW_UP" => "تم التنبيه بضرورة تحسين إنجاز الخطط",
        _ => "اجتماع متابعة مجدول مع رئيس القسم"
    };

    private record Metrics(int ClassesCount, int AttendanceRate, int LessonPlanRate, double EvaluationScore, DateOnly LastVisitDate, string Status);
}
