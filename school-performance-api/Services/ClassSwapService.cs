using System.Data;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Security;

namespace SchoolPerformance.Api.Services;

public class ClassSwapService
{
    private static readonly ClassSwapStatus[] OpenStatuses =
    [
        ClassSwapStatus.PendingTeacherApproval,
        ClassSwapStatus.PendingDepartmentHeadApproval,
        ClassSwapStatus.PendingAdministrationApproval,
        ClassSwapStatus.Approved
    ];

    private readonly AppDbContext _db;
    private readonly CurrentUserService _current;
    private readonly DepartmentHeadScopeService _heads;

    public ClassSwapService(AppDbContext db, CurrentUserService current, DepartmentHeadScopeService heads)
    {
        _db = db;
        _current = current;
        _heads = heads;
    }

    public async Task<List<ClassSwapTeacherOptionDto>> TeachersAsync()
    {
        var me = await CallerTeacherAsync();
        return await _db.Teachers.AsNoTracking()
            .Include(t => t.Department)
            .Where(t => t.Active && (me == null || t.Id != me.Id))
            .OrderBy(t => t.FullName)
            .Select(t => new ClassSwapTeacherOptionDto { Id = t.Id, FullName = t.FullName, DepartmentName = t.Department != null ? t.Department.Name : null })
            .ToListAsync();
    }

    public async Task<List<ClassSwapLessonDto>> TimetableAsync(DateOnly date, long teacherId)
    {
        var problem = ClassSwapRules.DateProblem(date, SchoolToday(), await IsHolidayAsync(date));
        if (problem != null) throw new AppException(problem);
        var day = ClassSwapRules.SchoolDayIndex(date)!.Value;
        var overrides = await OverrideMapAsync(date);
        var entries = await _db.ScheduleEntries.AsNoTracking()
            .Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
            .Where(e => e.Day == day && e.TeacherId == teacherId)
            .OrderBy(e => e.Period)
            .ToListAsync();
        return entries
            .Where(entry => !(overrides.TryGetValue(entry.Id, out var ov) && ov.Cancelled))
            .Select(entry =>
            {
                var period = overrides.TryGetValue(entry.Id, out var moved) ? moved.Period : entry.Period;
                return new ClassSwapLessonDto
                {
                    EntryId = entry.Id,
                    Period = period,
                    PeriodTime = ClassSwapRules.PeriodRange(period),
                    Subject = entry.Subject.Name,
                    ClassName = entry.SchoolClass.Name,
                    TeacherId = entry.TeacherId,
                    TeacherName = entry.Teacher.FullName,
                    Swapped = overrides.ContainsKey(entry.Id)
                };
            }).OrderBy(row => row.Period).ToList();
    }

    public async Task<ClassSwapPreviewDto> ValidateAsync(CreateClassSwapRequest request)
    {
        var me = await CallerTeacherAsync() ?? throw new AppException("لا يوجد ملف معلم مرتبط بهذا الحساب.");
        return await BuildPreviewAsync(request, me.Id, null);
    }

    public async Task<ClassSwapDetailDto> CreateAsync(CreateClassSwapRequest request)
    {
        var user = await _current.RequireUserAsync();
        if (!await _current.HasPermissionAsync(Perms.ClassSwapRequest))
        {
            throw new ForbiddenException("ليس لديك صلاحية لطلب تبديل حصة.");
        }
        var me = await CallerTeacherAsync() ?? throw new AppException("لا يوجد ملف معلم مرتبط بهذا الحساب.");

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var preview = await BuildPreviewAsync(request, me.Id, null);
        if (!preview.Valid)
        {
            throw new AppException(string.Join(" ", preview.Errors));
        }

        if (!ClassSwapRules.TryParseKind(request.Kind, out var kind))
        {
            throw new AppException("نوع الطلب غير صالح.");
        }

        var mine = await RequireEntryAsync(request.MyEntryId);
        var other = await RequireEntryAsync(request.OtherEntryId);
        var swap = new ClassSwapRequest
        {
            SwapDate = request.Date,
            Day = ClassSwapRules.SchoolDayIndex(request.Date)!.Value,
            Kind = kind,
            RequesterTeacherId = me.Id,
            CounterpartyTeacherId = request.OtherTeacherId,
            RequesterEntryId = mine.Id,
            CounterpartyEntryId = other.Id,
            RequesterPeriod = preview.BeforeRequester!.Period,
            CounterpartyPeriod = preview.BeforeCounterparty!.Period,
            RequesterSubject = mine.Subject.Name,
            RequesterClassName = mine.SchoolClass.Name,
            CounterpartySubject = other.Subject.Name,
            CounterpartyClassName = other.SchoolClass.Name,
            Reason = Clean(request.Reason),
            Status = ClassSwapStatus.PendingTeacherApproval,
            CreatedByUserId = user.Id,
            Approvals =
            [
                new ClassSwapApproval
                {
                    Stage = ClassSwapApprovalStage.Teacher,
                    ApproverTeacherId = request.OtherTeacherId,
                    Decision = ClassSwapDecision.Pending
                }
            ]
        };
        _db.ClassSwapRequests.Add(swap);
        await _db.SaveChangesAsync();
        AddHistory(swap, "CREATED", user, "المعلم", Clean(request.Reason));
        var noticeKind = kind == ClassSwapKind.TakeOnly ? "أخذ حصة دون مقابل" : "تبديل حصة";
        Notify(swap, other.Teacher.UserId, user.Id, $"طلب {noticeKind} من {mine.Teacher.FullName} بتاريخ {request.Date:yyyy-MM-dd}.");
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await DetailAsync(swap.Id);
    }

    public async Task<ClassSwapListResponse> ListAsync(string? view)
    {
        var user = await _current.RequireUserAsync();
        var seeAll = await _current.HasPermissionAsync(Perms.ClassSwapExecute);
        var canApprove = await _current.HasPermissionAsync(Perms.ClassSwapApprove);
        var teacher = await CallerTeacherAsync();
        var departmentId = canApprove ? await _heads.ResolveDepartmentIdAsync(user) : null;
        var perspective = seeAll ? "administration" : canApprove ? "department" : "teacher";

        var query = _db.ClassSwapRequests.AsNoTracking()
            .Include(r => r.RequesterTeacher).ThenInclude(t => t.Department)
            .Include(r => r.CounterpartyTeacher).ThenInclude(t => t.Department)
            .Include(r => r.Approvals).ThenInclude(a => a.Department)
            .AsQueryable();

        if (!seeAll)
        {
            var teacherId = teacher?.Id;
            query = query.Where(r =>
                (teacherId != null && (r.RequesterTeacherId == teacherId || r.CounterpartyTeacherId == teacherId))
                || (canApprove && departmentId != null && r.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId)));
        }

        var rows = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        var summary = new ClassSwapSummaryDto
        {
            Pending = rows.Count(r => r.Status is ClassSwapStatus.PendingTeacherApproval or ClassSwapStatus.PendingDepartmentHeadApproval or ClassSwapStatus.PendingAdministrationApproval),
            Approved = rows.Count(r => r.Status == ClassSwapStatus.Approved),
            Rejected = rows.Count(r => r.Status == ClassSwapStatus.Rejected),
            Executed = rows.Count(r => r.Status == ClassSwapStatus.Executed)
        };
        var filtered = rows.Where(r => MatchesView(r, view, perspective, teacher?.Id, departmentId)).ToList();
        return new ClassSwapListResponse
        {
            Perspective = perspective,
            Summary = summary,
            Items = filtered.Select(r => MapItem(r, user, teacher?.Id, departmentId, seeAll, canApprove)).ToList()
        };
    }

    public async Task<ClassSwapDetailDto> DetailAsync(long id)
    {
        var request = await LoadAsync(id) ?? throw new NotFoundException("طلب التبديل غير موجود.");
        await EnsureCanSeeAsync(request);
        var user = await _current.RequireUserAsync();
        var teacher = await CallerTeacherAsync();
        var seeAll = await _current.HasPermissionAsync(Perms.ClassSwapExecute);
        var canApprove = await _current.HasPermissionAsync(Perms.ClassSwapApprove);
        var departmentId = canApprove ? await _heads.ResolveDepartmentIdAsync(user) : null;
        return MapDetail(request, user, teacher?.Id, departmentId, seeAll, canApprove);
    }

    public async Task<ClassSwapDetailDto> ApproveAsync(long id, ClassSwapCommentRequest? body)
    {
        var user = await _current.RequireUserAsync();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await LoadTrackedAsync(id);
        var comment = Clean(body?.Comment);
        switch (request.Status)
        {
            case ClassSwapStatus.PendingTeacherApproval:
                await ApproveAsTeacherAsync(request, user, comment);
                break;
            case ClassSwapStatus.PendingDepartmentHeadApproval:
                await ApproveAsDepartmentAsync(request, user, comment);
                break;
            case ClassSwapStatus.PendingAdministrationApproval:
                await ApproveAsAdministrationAsync(request, user, comment);
                break;
            default:
                throw new AppException("لا يمكن اعتماد الطلب في حالته الحالية.");
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await DetailAsync(id);
    }

    public async Task<ClassSwapDetailDto> RejectAsync(long id, ClassSwapCommentRequest? body)
    {
        var user = await _current.RequireUserAsync();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await LoadTrackedAsync(id);
        var comment = Clean(body?.Comment);
        switch (request.Status)
        {
            case ClassSwapStatus.PendingTeacherApproval:
                await DecideTeacherAsync(request, user, false, comment);
                break;
            case ClassSwapStatus.PendingDepartmentHeadApproval:
                await DecideDepartmentAsync(request, user, false, comment);
                break;
            case ClassSwapStatus.PendingAdministrationApproval:
                await DecideAdministrationAsync(request, user, false, comment);
                break;
            default:
                throw new AppException("لا يمكن رفض الطلب في حالته الحالية.");
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await DetailAsync(id);
    }

    public async Task<ClassSwapDetailDto> CancelAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var teacher = await CallerTeacherAsync() ?? throw new ForbiddenException("لا يمكن إلغاء هذا الطلب.");
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await LoadTrackedAsync(id);
        if (request.RequesterTeacherId != teacher.Id)
        {
            throw new ForbiddenException("لا يمكن إلغاء إلا الطلب الذي أنشأته.");
        }
        if (!ClassSwapRules.CanCancel(request.Status))
        {
            throw new AppException(request.Status == ClassSwapStatus.Executed
                ? "لا يمكن إلغاء تبديل تم تنفيذه."
                : "لا يمكن إلغاء الطلب في حالته الحالية.");
        }
        request.Status = ClassSwapStatus.Cancelled;
        AddHistory(request, "CANCELLED", user, "المعلم", null);
        NotifyParties(request, user.Id, $"أُلغي طلب تبديل الحصة بتاريخ {request.SwapDate:yyyy-MM-dd}.");
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await DetailAsync(id);
    }

    public async Task<ClassSwapPreviewDto> ExecutionPreviewAsync(long id)
    {
        if (!await _current.HasPermissionAsync(Perms.ClassSwapExecute))
        {
            throw new ForbiddenException("ليس لديك صلاحية تنفيذ التبديل.");
        }
        var request = await LoadAsync(id) ?? throw new NotFoundException("طلب التبديل غير موجود.");
        if (request.Status != ClassSwapStatus.Approved)
        {
            throw new AppException("التنفيذ متاح بعد اكتمال الاعتماد فقط.");
        }
        return await ExecutionCheckAsync(request);
    }

    public async Task<ClassSwapDetailDto> ExecuteAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        if (!await _current.HasPermissionAsync(Perms.ClassSwapExecute))
        {
            throw new ForbiddenException("ليس لديك صلاحية تنفيذ التبديل.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await LoadTrackedAsync(id);
        if (request.Status == ClassSwapStatus.Executed)
        {
            throw new AppException("تم تنفيذ هذا التبديل مسبقاً.");
        }
        if (request.Status != ClassSwapStatus.Approved)
        {
            throw new AppException("لا يمكن تنفيذ الطلب قبل اكتمال الاعتماد.");
        }

        var preview = await ExecutionCheckAsync(request);
        if (!preview.Valid)
        {
            throw new AppException(string.Join(" ", preview.Errors));
        }

        _db.ScheduleOverrides.Add(new ScheduleOverride
        {
            OverrideDate = request.SwapDate,
            ScheduleEntryId = request.RequesterEntryId,
            EffectivePeriod = request.CounterpartyPeriod,
            Cancelled = false,
            SwapRequestId = request.Id,
            CreatedByUserId = user.Id
        });
        if (request.Kind == ClassSwapKind.TakeOnly)
        {
            _db.ScheduleOverrides.Add(new ScheduleOverride
            {
                OverrideDate = request.SwapDate,
                ScheduleEntryId = request.CounterpartyEntryId,
                EffectivePeriod = 0,
                Cancelled = true,
                SwapRequestId = request.Id,
                CreatedByUserId = user.Id
            });
        }
        else
        {
            _db.ScheduleOverrides.Add(new ScheduleOverride
            {
                OverrideDate = request.SwapDate,
                ScheduleEntryId = request.CounterpartyEntryId,
                EffectivePeriod = request.RequesterPeriod,
                Cancelled = false,
                SwapRequestId = request.Id,
                CreatedByUserId = user.Id
            });
        }
        request.Status = ClassSwapStatus.Executed;
        AddHistory(request, "EXECUTED", user, "الإدارة المدرسية", null);
        var doneLabel = request.Kind == ClassSwapKind.TakeOnly ? "أخذ الحصة" : "تبديل الحصة";
        NotifyParties(request, user.Id, $"تم تنفيذ {doneLabel} بتاريخ {request.SwapDate:yyyy-MM-dd}.");
        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new AppException("نفّذ مستخدم آخر هذا الطلب للتو. حدّث الصفحة.");
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new AppException("تعذر التنفيذ لأن إحدى الحصتين مبدّلة مسبقاً في هذا التاريخ.");
        }
        return await DetailAsync(id);
    }

    public async Task<List<ClassSwapNoticeDto>> MyNoticesAsync()
    {
        var user = await _current.RequireUserAsync();
        return await _db.ClassSwapNotices.AsNoTracking()
            .Where(n => n.UserId == user.Id && n.ReadAt == null)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new ClassSwapNoticeDto { Id = n.Id, RequestId = n.RequestId, Message = n.Message })
            .ToListAsync();
    }

    public async Task MarkNoticeReadAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var notice = await _db.ClassSwapNotices.FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.Id)
            ?? throw new NotFoundException("التنبيه غير موجود.");
        notice.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task ApproveAsTeacherAsync(ClassSwapRequest request, User user, string? comment)
    {
        await DecideTeacherAsync(request, user, true, comment);
        var departments = RequiredDepartmentsOf(request);
        foreach (var departmentId in departments)
        {
            request.Approvals.Add(new ClassSwapApproval
            {
                Stage = ClassSwapApprovalStage.Department,
                DepartmentId = departmentId,
                Decision = ClassSwapDecision.Pending
            });
        }
        request.Status = ClassSwapStatus.PendingDepartmentHeadApproval;
        foreach (var departmentId in departments)
        {
            foreach (var userId in await HeadUserIdsAsync(departmentId))
            {
                Notify(request, userId, user.Id, $"طلب تبديل حصة بتاريخ {request.SwapDate:yyyy-MM-dd} بانتظار موافقة رئيس الشعبة.");
            }
        }
    }

    private async Task ApproveAsDepartmentAsync(ClassSwapRequest request, User user, string? comment)
    {
        await DecideDepartmentAsync(request, user, true, comment);
        var pending = request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.Decision == ClassSwapDecision.Pending);
        if (pending) return;
        request.Approvals.Add(new ClassSwapApproval
        {
            Stage = ClassSwapApprovalStage.Administration,
            Decision = ClassSwapDecision.Pending
        });
        request.Status = ClassSwapStatus.PendingAdministrationApproval;
        foreach (var userId in await AdministrationUserIdsAsync())
        {
            Notify(request, userId, user.Id, $"طلب تبديل حصة بتاريخ {request.SwapDate:yyyy-MM-dd} بانتظار موافقة الإدارة.");
        }
    }

    private async Task ApproveAsAdministrationAsync(ClassSwapRequest request, User user, string? comment)
    {
        await DecideAdministrationAsync(request, user, true, comment);
        request.Status = ClassSwapStatus.Approved;
        NotifyParties(request, user.Id, $"اعتُمد طلب تبديل الحصة بتاريخ {request.SwapDate:yyyy-MM-dd} وهو جاهز للتنفيذ.");
    }

    private async Task DecideTeacherAsync(ClassSwapRequest request, User user, bool approve, string? comment)
    {
        var teacher = await CallerTeacherAsync();
        if (teacher == null || teacher.Id != request.CounterpartyTeacherId)
        {
            throw new ForbiddenException("موافقة المعلم الآخر فقط هي المطلوبة في هذه المرحلة.");
        }
        var row = request.Approvals.First(a => a.Stage == ClassSwapApprovalStage.Teacher);
        Stamp(row, user, approve, comment);
        if (!approve)
        {
            request.Status = ClassSwapStatus.Rejected;
            AddHistory(request, "TEACHER_REJECTED", user, "المعلم", comment);
            Notify(request, request.RequesterTeacher.UserId, user.Id, $"رُفض طلب تبديل الحصة بتاريخ {request.SwapDate:yyyy-MM-dd} من المعلم الآخر.");
            return;
        }
        AddHistory(request, "TEACHER_APPROVED", user, "المعلم", comment);
    }

    private async Task DecideDepartmentAsync(ClassSwapRequest request, User user, bool approve, string? comment)
    {
        if (!await _current.HasPermissionAsync(Perms.ClassSwapApprove))
        {
            throw new ForbiddenException("ليس لديك صلاحية اعتماد رئيس الشعبة.");
        }
        var departmentId = await _heads.ResolveDepartmentIdAsync(user)
            ?? throw new ForbiddenException("لا يمكن تحديد شعبتك.");
        var row = request.Approvals.FirstOrDefault(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId && a.Decision == ClassSwapDecision.Pending)
            ?? throw new ForbiddenException("لا توجد موافقة مطلوبة من شعبتك على هذا الطلب.");
        Stamp(row, user, approve, comment);
        var departmentName = row.Department?.Name ?? "الشعبة";
        if (!approve)
        {
            request.Status = ClassSwapStatus.Rejected;
            AddHistory(request, "DEPARTMENT_REJECTED", user, "رئيس الشعبة", comment);
            NotifyParties(request, user.Id, $"رُفض طلب تبديل الحصة بتاريخ {request.SwapDate:yyyy-MM-dd} من {departmentName}.");
            return;
        }
        AddHistory(request, "DEPARTMENT_APPROVED", user, "رئيس الشعبة", string.IsNullOrWhiteSpace(comment) ? departmentName : $"{departmentName}: {comment}");
    }

    private async Task DecideAdministrationAsync(ClassSwapRequest request, User user, bool approve, string? comment)
    {
        if (!await _current.HasPermissionAsync(Perms.ClassSwapExecute))
        {
            throw new ForbiddenException("ليس لديك صلاحية اعتماد الإدارة.");
        }
        var row = request.Approvals.FirstOrDefault(a => a.Stage == ClassSwapApprovalStage.Administration && a.Decision == ClassSwapDecision.Pending)
            ?? throw new AppException("لا توجد موافقة إدارية معلّقة.");
        Stamp(row, user, approve, comment);
        if (!approve)
        {
            request.Status = ClassSwapStatus.Rejected;
            AddHistory(request, "ADMIN_REJECTED", user, "الإدارة المدرسية", comment);
            NotifyParties(request, user.Id, $"رُفض طلب تبديل الحصة بتاريخ {request.SwapDate:yyyy-MM-dd} من الإدارة.");
            return;
        }
        AddHistory(request, "ADMIN_APPROVED", user, "الإدارة المدرسية", comment);
    }

    private async Task<ClassSwapPreviewDto> BuildPreviewAsync(CreateClassSwapRequest request, long requesterTeacherId, long? ignoreRequestId)
    {
        var errors = new List<string>();
        if (!ClassSwapRules.TryParseKind(request.Kind, out var kind))
        {
            errors.Add("نوع الطلب غير صالح.");
            kind = ClassSwapKind.Exchange;
        }
        var holiday = await IsHolidayAsync(request.Date);
        var dateProblem = ClassSwapRules.DateProblem(request.Date, SchoolToday(), holiday);
        if (dateProblem != null) errors.Add(dateProblem);
        var day = ClassSwapRules.SchoolDayIndex(request.Date);

        var requester = await _db.Teachers.AsNoTracking().Include(t => t.Department).FirstOrDefaultAsync(t => t.Id == requesterTeacherId);
        var other = await _db.Teachers.AsNoTracking().Include(t => t.Department).FirstOrDefaultAsync(t => t.Id == request.OtherTeacherId);
        if (requester == null || !requester.Active) errors.Add("المعلم مقدّم الطلب غير موجود أو غير نشط.");
        if (other == null || !other.Active) errors.Add("المعلم الآخر غير موجود أو غير نشط.");
        if (requester != null && other != null)
        {
            try
            {
                ClassSwapRules.RequiredDepartments(requester.DepartmentId, other.DepartmentId);
            }
            catch (InvalidOperationException)
            {
                errors.Add("كلا المعلمين يجب أن يكونا مرتبطين بشعبة حتى يُحدَّد رئيس الشعبة.");
            }
        }

        ScheduleEntry? mine = null;
        ScheduleEntry? theirs = null;
        if (day != null)
        {
            mine = await _db.ScheduleEntries.AsNoTracking().Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
                .FirstOrDefaultAsync(e => e.Id == request.MyEntryId && e.Day == day);
            theirs = await _db.ScheduleEntries.AsNoTracking().Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
                .FirstOrDefaultAsync(e => e.Id == request.OtherEntryId && e.Day == day);
        }
        if (mine == null || theirs == null) errors.Add("إحدى الحصتين غير موجودة في جدول هذا اليوم.");

        var overrides = day == null ? new Dictionary<long, DayOverride>() : await OverrideMapAsync(request.Date);
        if (mine != null && overrides.ContainsKey(mine.Id) || theirs != null && overrides.ContainsKey(theirs.Id))
        {
            errors.Add("إحدى الحصتين مبدّلة مسبقاً في هذا التاريخ.");
        }

        if (day != null && mine != null && theirs != null)
        {
            var reserved = await _db.ClassSwapRequests.AsNoTracking().AnyAsync(r =>
                r.SwapDate == request.Date
                && OpenStatuses.Contains(r.Status)
                && (ignoreRequestId == null || r.Id != ignoreRequestId)
                && (r.RequesterEntryId == mine.Id || r.CounterpartyEntryId == mine.Id || r.RequesterEntryId == theirs.Id || r.CounterpartyEntryId == theirs.Id));
            if (reserved) errors.Add("توجد طلب تبديل قائم لإحدى هاتين الحصتين في هذا التاريخ.");
        }

        ClassSwapSideDto? beforeA = null, beforeB = null, afterA = null, afterB = null;
        if (day != null && mine != null && theirs != null && requester != null && other != null)
        {
            var board = await EffectiveBoardAsync(request.Date, day.Value, ignoreRequestId, mine.Id, theirs.Id);
            errors.AddRange(kind == ClassSwapKind.TakeOnly
                ? ClassSwapRules.CheckTake(board, mine.Id, theirs.Id, requester.Id, other.Id)
                : ClassSwapRules.CheckSwap(board, mine.Id, theirs.Id, requester.Id, other.Id));
            var left = board.FirstOrDefault(slot => slot.EntryId == mine.Id);
            var right = board.FirstOrDefault(slot => slot.EntryId == theirs.Id);
            if (left != null && right != null)
            {
                beforeA = Side(requester.FullName, left.Period, mine.Subject.Name, mine.SchoolClass.Name);
                beforeB = Side(other.FullName, right.Period, theirs.Subject.Name, theirs.SchoolClass.Name);
                afterA = Side(requester.FullName, right.Period, mine.Subject.Name, mine.SchoolClass.Name);
                afterB = kind == ClassSwapKind.TakeOnly
                    ? Side(other.FullName, right.Period, theirs.Subject.Name, theirs.SchoolClass.Name, cancelled: true)
                    : Side(other.FullName, left.Period, theirs.Subject.Name, theirs.SchoolClass.Name);
            }
        }

        return new ClassSwapPreviewDto
        {
            Valid = errors.Count == 0,
            Kind = kind.ToString(),
            KindLabel = ClassSwapRules.KindLabel(kind),
            Errors = errors.Distinct().ToList(),
            BeforeRequester = beforeA,
            BeforeCounterparty = beforeB,
            AfterRequester = afterA,
            AfterCounterparty = afterB
        };
    }

    private async Task<ClassSwapPreviewDto> ExecutionCheckAsync(ClassSwapRequest request)
    {
        var errors = new List<string>();
        var holiday = await IsHolidayAsync(request.SwapDate);
        var dateProblem = ClassSwapRules.DateProblem(request.SwapDate, SchoolToday(), holiday);
        if (dateProblem != null && request.SwapDate < SchoolToday()) errors.Add(dateProblem);
        if (ClassSwapRules.SchoolDayIndex(request.SwapDate) == null) errors.Add("هذا اليوم ليس يوماً دراسياً.");
        if (holiday) errors.Add("هذا التاريخ إجازة رسمية.");

        var mine = await _db.ScheduleEntries.AsNoTracking().Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
            .FirstOrDefaultAsync(e => e.Id == request.RequesterEntryId);
        var theirs = await _db.ScheduleEntries.AsNoTracking().Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
            .FirstOrDefaultAsync(e => e.Id == request.CounterpartyEntryId);
        if (mine == null || theirs == null)
        {
            errors.Add("تغيّر الجدول منذ اعتماد الطلب، ولم تعد إحدى الحصتين موجودة.");
        }
        else
        {
            if (!mine.Teacher.Active || !theirs.Teacher.Active) errors.Add("أحد المعلمين لم يعد نشطاً.");
            if (mine.TeacherId != request.RequesterTeacherId || theirs.TeacherId != request.CounterpartyTeacherId)
            {
                errors.Add("تغيّر معلم الحصة منذ تقديم الطلب.");
            }
            var board = await EffectiveBoardAsync(request.SwapDate, request.Day, request.Id, mine.Id, theirs.Id);
            var left = board.FirstOrDefault(slot => slot.EntryId == mine.Id);
            var right = board.FirstOrDefault(slot => slot.EntryId == theirs.Id);
            if (left == null || right == null || left.Period != request.RequesterPeriod || right.Period != request.CounterpartyPeriod)
            {
                errors.Add("تغيّر توقيت الحصة منذ اعتماد الطلب، ولا يمكن تنفيذ التبديل.");
            }
            errors.AddRange(request.Kind == ClassSwapKind.TakeOnly
                ? ClassSwapRules.CheckTake(board, mine.Id, theirs.Id, request.RequesterTeacherId, request.CounterpartyTeacherId)
                : ClassSwapRules.CheckSwap(board, mine.Id, theirs.Id, request.RequesterTeacherId, request.CounterpartyTeacherId));
        }

        return new ClassSwapPreviewDto
        {
            Valid = errors.Count == 0,
            Kind = request.Kind.ToString(),
            KindLabel = ClassSwapRules.KindLabel(request.Kind),
            Errors = errors.Distinct().ToList(),
            BeforeRequester = Side(request.RequesterTeacher.FullName, request.RequesterPeriod, request.RequesterSubject, request.RequesterClassName),
            BeforeCounterparty = Side(request.CounterpartyTeacher.FullName, request.CounterpartyPeriod, request.CounterpartySubject, request.CounterpartyClassName),
            AfterRequester = Side(request.RequesterTeacher.FullName, request.CounterpartyPeriod, request.RequesterSubject, request.RequesterClassName),
            AfterCounterparty = request.Kind == ClassSwapKind.TakeOnly
                ? Side(request.CounterpartyTeacher.FullName, request.CounterpartyPeriod, request.CounterpartySubject, request.CounterpartyClassName, cancelled: true)
                : Side(request.CounterpartyTeacher.FullName, request.RequesterPeriod, request.CounterpartySubject, request.CounterpartyClassName)
        };
    }

    private async Task<List<ClassSwapRules.LessonSlot>> EffectiveBoardAsync(DateOnly date, int day, long? ignoreRequestId, long entryA, long entryB)
    {
        var entries = await _db.ScheduleEntries.AsNoTracking()
            .Where(e => e.Day == day)
            .Select(e => new { e.Id, e.TeacherId, e.SchoolClassId, e.Period })
            .ToListAsync();
        var overrides = await OverrideMapAsync(date);
        var slots = entries
            .Where(entry => !(overrides.TryGetValue(entry.Id, out var ov) && ov.Cancelled))
            .Select(entry => new ClassSwapRules.LessonSlot(
                entry.Id,
                entry.TeacherId,
                entry.SchoolClassId,
                overrides.TryGetValue(entry.Id, out var period) ? period.Period : entry.Period)).ToList();

        var open = await _db.ClassSwapRequests.AsNoTracking()
            .Where(r => r.SwapDate == date && OpenStatuses.Contains(r.Status) && (ignoreRequestId == null || r.Id != ignoreRequestId))
            .Select(r => new { r.Kind, r.RequesterEntryId, r.CounterpartyEntryId, r.RequesterPeriod, r.CounterpartyPeriod })
            .ToListAsync();
        foreach (var pending in open)
        {
            var left = slots.FindIndex(slot => slot.EntryId == pending.RequesterEntryId);
            var right = slots.FindIndex(slot => slot.EntryId == pending.CounterpartyEntryId);
            if (pending.RequesterEntryId == entryA || pending.CounterpartyEntryId == entryA
                || pending.RequesterEntryId == entryB || pending.CounterpartyEntryId == entryB) continue;
            if (left < 0 || right < 0) continue;
            if (slots[left].Period != pending.RequesterPeriod || slots[right].Period != pending.CounterpartyPeriod) continue;
            if (pending.Kind == ClassSwapKind.TakeOnly)
            {
                var targetPeriod = slots[right].Period;
                var requesterId = slots[left].EntryId;
                slots[left] = slots[left] with { Period = targetPeriod };
                slots.RemoveAll(slot => slot.EntryId == pending.CounterpartyEntryId);
                // keep left reference consistent if list shifted
                left = slots.FindIndex(slot => slot.EntryId == requesterId);
            }
            else
            {
                var leftPeriod = slots[left].Period;
                var rightPeriod = slots[right].Period;
                slots[left] = slots[left] with { Period = rightPeriod };
                slots[right] = slots[right] with { Period = leftPeriod };
            }
        }
        return slots;
    }

    private sealed record DayOverride(int Period, bool Cancelled);

    private async Task<Dictionary<long, DayOverride>> OverrideMapAsync(DateOnly date) =>
        await _db.ScheduleOverrides.AsNoTracking()
            .Where(o => o.OverrideDate == date)
            .ToDictionaryAsync(o => o.ScheduleEntryId, o => new DayOverride(o.EffectivePeriod, o.Cancelled));

    private async Task<ScheduleEntry> RequireEntryAsync(long id) =>
        await _db.ScheduleEntries.Include(e => e.Subject).Include(e => e.SchoolClass).Include(e => e.Teacher)
            .FirstOrDefaultAsync(e => e.Id == id) ?? throw new AppException("الحصة غير موجودة.");

    private async Task<ClassSwapRequest> LoadTrackedAsync(long id) =>
        await _db.ClassSwapRequests
            .Include(r => r.RequesterTeacher)
            .Include(r => r.CounterpartyTeacher)
            .Include(r => r.Approvals).ThenInclude(a => a.Department)
            .Include(r => r.History)
            .FirstOrDefaultAsync(r => r.Id == id) ?? throw new NotFoundException("طلب التبديل غير موجود.");

    private async Task<ClassSwapRequest?> LoadAsync(long id) =>
        await _db.ClassSwapRequests.AsNoTracking()
            .Include(r => r.RequesterTeacher).ThenInclude(t => t.Department)
            .Include(r => r.CounterpartyTeacher).ThenInclude(t => t.Department)
            .Include(r => r.Approvals).ThenInclude(a => a.Department)
            .Include(r => r.Approvals).ThenInclude(a => a.ActedBy)
            .Include(r => r.History).ThenInclude(h => h.User)
            .FirstOrDefaultAsync(r => r.Id == id);

    private async Task EnsureCanSeeAsync(ClassSwapRequest request)
    {
        if (await _current.HasPermissionAsync(Perms.ClassSwapExecute)) return;
        var user = await _current.RequireUserAsync();
        var teacher = await CallerTeacherAsync();
        if (teacher != null && (request.RequesterTeacherId == teacher.Id || request.CounterpartyTeacherId == teacher.Id)) return;
        if (await _current.HasPermissionAsync(Perms.ClassSwapApprove))
        {
            var departmentId = await _heads.ResolveDepartmentIdAsync(user);
            if (departmentId != null && request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId)) return;
        }
        throw new ForbiddenException("ليس لديك صلاحية عرض هذا الطلب.");
    }

    private async Task<Teacher?> CallerTeacherAsync()
    {
        var user = await _current.RequireUserAsync();
        return await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
    }

    private static IReadOnlyList<long> RequiredDepartmentsOf(ClassSwapRequest request)
    {
        try
        {
            return ClassSwapRules.RequiredDepartments(request.RequesterTeacher.DepartmentId, request.CounterpartyTeacher.DepartmentId);
        }
        catch (InvalidOperationException)
        {
            throw new AppException("لا يمكن متابعة الطلب لأن أحد المعلمين غير مرتبط بشعبة.");
        }
    }

    private async Task<List<long>> HeadUserIdsAsync(long departmentId)
    {
        var teachers = await _db.Teachers.AsNoTracking()
            .Include(t => t.User!).ThenInclude(u => u.Roles)
            .Where(t => t.Active && t.DepartmentId == departmentId && t.UserId != null)
            .ToListAsync();
        var ids = teachers
            .Where(t => t.User!.Roles.Any(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD")))
            .Select(t => t.UserId!.Value)
            .ToList();
        var roleKey = $"DEPARTMENT_HEAD_{departmentId}";
        ids.AddRange(await _db.Users.AsNoTracking()
            .Where(u => u.Active && u.Roles.Any(r => r.RoleKey == roleKey))
            .Select(u => u.Id)
            .ToListAsync());
        return ids.Distinct().ToList();
    }

    private async Task<List<long>> AdministrationUserIdsAsync() =>
        await _db.Users.AsNoTracking()
            .Where(u => u.Active && u.Roles.Any(r => r.RoleKey == "SCHOOL_MANAGER" || r.RoleKey == "ASSISTANT_MANAGER" || r.RoleKey == "ADMIN"))
            .Select(u => u.Id)
            .ToListAsync();

    private void NotifyParties(ClassSwapRequest request, long actorId, string message)
    {
        Notify(request, request.RequesterTeacher.UserId, actorId, message);
        Notify(request, request.CounterpartyTeacher.UserId, actorId, message);
    }

    private void Notify(ClassSwapRequest request, long? userId, long actorId, string message)
    {
        if (userId == null || userId == actorId) return;
        _db.ClassSwapNotices.Add(new ClassSwapNotice { UserId = userId.Value, RequestId = request.Id, Message = message, Request = request });
    }

    private static void Stamp(ClassSwapApproval row, User user, bool approve, string? comment)
    {
        row.Decision = approve ? ClassSwapDecision.Approved : ClassSwapDecision.Rejected;
        row.ActedByUserId = user.Id;
        row.ActedAt = DateTime.UtcNow;
        row.Comment = comment;
    }

    private static void AddHistory(ClassSwapRequest request, string action, User user, string role, string? comment)
    {
        request.History.Add(new ClassSwapHistory
        {
            Action = action,
            UserId = user.Id,
            User = user,
            RoleLabel = role,
            Comment = comment
        });
    }

    private static bool MatchesView(ClassSwapRequest request, string? view, string perspective, long? teacherId, long? departmentId)
    {
        var key = string.IsNullOrWhiteSpace(view) ? "all" : view.Trim().ToLowerInvariant();
        if (key is "all" or "") return true;
        return perspective switch
        {
            "administration" => key switch
            {
                "awaiting" => request.Status == ClassSwapStatus.PendingAdministrationApproval,
                "ready" => request.Status == ClassSwapStatus.Approved,
                "executed" => request.Status == ClassSwapStatus.Executed,
                "rejected" => request.Status == ClassSwapStatus.Rejected,
                _ => true
            },
            "department" => key switch
            {
                "mine" => (request.Status == ClassSwapStatus.PendingDepartmentHeadApproval
                        && request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId && a.Decision == ClassSwapDecision.Pending))
                    || (teacherId != null && request.Status == ClassSwapStatus.PendingTeacherApproval && request.CounterpartyTeacherId == teacherId),
                "approved" => request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId && a.Decision == ClassSwapDecision.Approved),
                "rejected" => request.Status == ClassSwapStatus.Rejected,
                _ => true
            },
            _ => key switch
            {
                "awaiting" => request.Status is ClassSwapStatus.PendingTeacherApproval or ClassSwapStatus.PendingDepartmentHeadApproval or ClassSwapStatus.PendingAdministrationApproval,
                "approved" => request.Status == ClassSwapStatus.Approved,
                "rejected" => request.Status == ClassSwapStatus.Rejected,
                "executed" => request.Status == ClassSwapStatus.Executed,
                _ => true
            }
        };
    }

    private static ClassSwapListItemDto MapItem(ClassSwapRequest request, User user, long? teacherId, long? departmentId, bool seeAll, bool canApprove)
    {
        var item = new ClassSwapListItemDto
        {
            Id = request.Id,
            Number = $"SW-{request.Id:0000}",
            Date = request.SwapDate,
            DayLabel = ClassSwapRules.DayLabel(request.Day),
            Kind = request.Kind.ToString(),
            KindLabel = ClassSwapRules.KindLabel(request.Kind),
            RequesterTeacher = request.RequesterTeacher.FullName,
            RequesterPeriod = request.RequesterPeriod,
            RequesterSubject = request.RequesterSubject,
            RequesterClassName = request.RequesterClassName,
            CounterpartyTeacher = request.CounterpartyTeacher.FullName,
            CounterpartyPeriod = request.CounterpartyPeriod,
            CounterpartySubject = request.CounterpartySubject,
            CounterpartyClassName = request.CounterpartyClassName,
            Departments = string.Join("، ", new[] { request.RequesterTeacher.Department?.Name, request.CounterpartyTeacher.Department?.Name }.Where(name => !string.IsNullOrWhiteSpace(name)).Distinct()),
            Status = request.Status.ToString(),
            StatusLabel = ClassSwapRules.StatusLabel(request.Status),
            CreatedAt = request.CreatedAt
        };
        item.CanApprove = CanAct(request, teacherId, departmentId, seeAll, canApprove);
        item.CanReject = item.CanApprove;
        item.CanCancel = teacherId != null && request.RequesterTeacherId == teacherId && ClassSwapRules.CanCancel(request.Status);
        item.CanExecute = seeAll && request.Status == ClassSwapStatus.Approved;
        return item;
    }

    private static ClassSwapDetailDto MapDetail(ClassSwapRequest request, User user, long? teacherId, long? departmentId, bool seeAll, bool canApprove)
    {
        var item = MapItem(request, user, teacherId, departmentId, seeAll, canApprove);
        return new ClassSwapDetailDto
        {
            Id = item.Id,
            Number = item.Number,
            Date = item.Date,
            DayLabel = item.DayLabel,
            Kind = item.Kind,
            KindLabel = item.KindLabel,
            RequesterTeacher = item.RequesterTeacher,
            RequesterPeriod = item.RequesterPeriod,
            RequesterSubject = item.RequesterSubject,
            RequesterClassName = item.RequesterClassName,
            CounterpartyTeacher = item.CounterpartyTeacher,
            CounterpartyPeriod = item.CounterpartyPeriod,
            CounterpartySubject = item.CounterpartySubject,
            CounterpartyClassName = item.CounterpartyClassName,
            Departments = item.Departments,
            Status = item.Status,
            StatusLabel = item.StatusLabel,
            CreatedAt = item.CreatedAt,
            CanApprove = item.CanApprove,
            CanReject = item.CanReject,
            CanCancel = item.CanCancel,
            CanExecute = item.CanExecute,
            Reason = request.Reason,
            RequesterDepartment = request.RequesterTeacher.Department?.Name ?? "—",
            CounterpartyDepartment = request.CounterpartyTeacher.Department?.Name ?? "—",
            BeforeRequester = Side(request.RequesterTeacher.FullName, request.RequesterPeriod, request.RequesterSubject, request.RequesterClassName),
            BeforeCounterparty = Side(request.CounterpartyTeacher.FullName, request.CounterpartyPeriod, request.CounterpartySubject, request.CounterpartyClassName),
            AfterRequester = Side(request.RequesterTeacher.FullName, request.CounterpartyPeriod, request.RequesterSubject, request.RequesterClassName),
            AfterCounterparty = request.Kind == ClassSwapKind.TakeOnly
                ? Side(request.CounterpartyTeacher.FullName, request.CounterpartyPeriod, request.CounterpartySubject, request.CounterpartyClassName, cancelled: true)
                : Side(request.CounterpartyTeacher.FullName, request.RequesterPeriod, request.CounterpartySubject, request.CounterpartyClassName),
            Approvals = request.Approvals
                .OrderBy(a => a.Stage)
                .ThenBy(a => a.Department?.Name)
                .Select(a => new ClassSwapApprovalDto
                {
                    Stage = a.Stage.ToString(),
                    StageLabel = a.Stage switch
                    {
                        ClassSwapApprovalStage.Teacher => "موافقة المعلم",
                        ClassSwapApprovalStage.Department => "موافقة رئيس الشعبة",
                        _ => "موافقة الإدارة"
                    },
                    DepartmentName = a.Department?.Name,
                    Decision = a.Decision.ToString(),
                    DecisionLabel = a.Decision switch
                    {
                        ClassSwapDecision.Approved => "تمت الموافقة",
                        ClassSwapDecision.Rejected => "مرفوض",
                        _ => "بانتظار"
                    },
                    ActedBy = a.ActedBy?.FullName,
                    ActedAt = a.ActedAt,
                    Comment = a.Comment
                }).ToList(),
            History = request.History.OrderBy(h => h.CreatedAt).Select(h => new ClassSwapHistoryDto
            {
                Action = h.Action,
                ActionLabel = HistoryLabel(h.Action),
                UserName = h.User?.FullName ?? "—",
                RoleLabel = h.RoleLabel,
                At = h.CreatedAt,
                Comment = h.Comment
            }).ToList()
        };
    }

    private static bool CanAct(ClassSwapRequest request, long? teacherId, long? departmentId, bool seeAll, bool canApprove) => request.Status switch
    {
        ClassSwapStatus.PendingTeacherApproval => teacherId != null && request.CounterpartyTeacherId == teacherId,
        ClassSwapStatus.PendingDepartmentHeadApproval => canApprove && departmentId != null && request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Department && a.DepartmentId == departmentId && a.Decision == ClassSwapDecision.Pending),
        ClassSwapStatus.PendingAdministrationApproval => seeAll && request.Approvals.Any(a => a.Stage == ClassSwapApprovalStage.Administration && a.Decision == ClassSwapDecision.Pending),
        _ => false
    };

    private static ClassSwapSideDto Side(string teacher, int period, string subject, string className, bool cancelled = false) => new()
    {
        TeacherName = teacher,
        Period = period,
        PeriodTime = ClassSwapRules.PeriodRange(period),
        Subject = subject,
        ClassName = className,
        Cancelled = cancelled
    };

    private static string HistoryLabel(string action) => action switch
    {
        "CREATED" => "أُنشئ الطلب",
        "TEACHER_APPROVED" => "وافق المعلم الآخر",
        "TEACHER_REJECTED" => "رفض المعلم الآخر",
        "DEPARTMENT_APPROVED" => "وافق رئيس الشعبة",
        "DEPARTMENT_REJECTED" => "رفض رئيس الشعبة",
        "ADMIN_APPROVED" => "وافقت الإدارة",
        "ADMIN_REJECTED" => "رفضت الإدارة",
        "EXECUTED" => "نُفّذ التبديل",
        "CANCELLED" => "أُلغي الطلب",
        _ => action
    };

    private async Task<bool> IsHolidayAsync(DateOnly date) =>
        await _db.CalendarEvents.AsNoTracking().AnyAsync(evt =>
            evt.EventType == CalendarEventType.PUBLIC
            && evt.Title.Contains("إجازة")
            && evt.StartDate <= date
            && (evt.EndDate == null || evt.EndDate >= date));

    private static DateOnly SchoolToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));

    private static string? Clean(string? value)
    {
        var text = value?.Trim();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        var message = exception.InnerException?.Message ?? exception.Message;
        return message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
            || message.Contains("2627")
            || message.Contains("2601");
    }
}
