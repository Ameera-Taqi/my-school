using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Security;
using TaskStatus = SchoolPerformance.Api.Entities.TaskStatus;

namespace SchoolPerformance.Api.Services;

public class TaskService
{
    private readonly AppDbContext _db;
    private readonly CurrentUserService _current;
    private readonly TaskAssignmentScopeService _scope;

    public TaskService(AppDbContext db, CurrentUserService current, TaskAssignmentScopeService scope)
    {
        _db = db;
        _current = current;
        _scope = scope;
    }

    public async Task<List<AssignableUserDto>> AssignableUsersAsync()
    {
        var user = await _current.RequireUserAsync();
        if (!_scope.CanAssignTasks(user)) throw new ForbiddenException("ليس لديك صلاحية إسناد المهام.");
        return await _scope.GetAssignableUsersAsync(user);
    }

    public async Task<TaskListResponse> ListAsync(string? view, string? query, string? status, string? priority)
    {
        var user = await _current.RequireUserAsync();
        var canAssign = _scope.CanAssignTasks(user);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
        var rows = await QueryBase().ToListAsync();
        foreach (var task in rows) RefreshAggregate(task, today);

        var visible = rows.Where(t => CanSee(user, t, canAssign)).ToList();
        var summarySource = view switch
        {
            "assigned" => visible.Where(t => t.CreatedById == user.Id).ToList(),
            "completed" => visible.Where(t => EffectiveStatus(t, today, user) == TaskStatus.COMPLETED).ToList(),
            "all" => visible,
            _ => visible.Where(t => IsAssignee(t, user.Id) || (t.Assignees.Count == 0 && t.AssignedToId == user.Id)).ToList()
        };

        IEnumerable<TaskItem> filtered = view switch
        {
            "assigned" => visible.Where(t => t.CreatedById == user.Id),
            "completed" => visible.Where(t => EffectiveStatus(t, today, user) == TaskStatus.COMPLETED),
            "all" => visible,
            _ => visible.Where(t => IsAssignee(t, user.Id) || (t.Assignees.Count == 0 && t.AssignedToId == user.Id))
        };

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TaskStatus>(status, true, out var st))
            filtered = filtered.Where(t => EffectiveStatus(t, today, user) == st);
        if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<TaskPriority>(priority, true, out var pr))
            filtered = filtered.Where(t => t.Priority == pr);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim();
            filtered = filtered.Where(t =>
                t.Title.Contains(q, StringComparison.OrdinalIgnoreCase)
                || (t.Description?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false)
                || (t.Assignee?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false)
                || (t.CreatedBy?.FullName.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false)
                || t.Assignees.Any(a => a.User?.FullName.Contains(q, StringComparison.OrdinalIgnoreCase) == true));
        }

        var items = filtered.OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate).ThenByDescending(t => t.Id)
            .Select(t => Map(t, user, canAssign, today, includeActivities: false)).ToList();
        return new TaskListResponse
        {
            Items = items,
            Summary = BuildSummary(summarySource, today, user)
        };
    }

    /// <summary>Tasks assigned to the current user (home dashboard).</summary>
    public async Task<List<TaskDto>> FindAllAsync()
    {
        var list = await ListAsync("mine", null, null, null);
        return list.Items.Take(50).ToList();
    }

    public async Task<TaskDto> FindByIdAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var canAssign = _scope.CanAssignTasks(user);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
        var task = await _db.Tasks.AsNoTracking()
            .Include(t => t.Meeting)
            .Include(t => t.CreatedBy)
            .Include(t => t.Assignees).ThenInclude(a => a.User)
            .Include(t => t.Activities).ThenInclude(a => a.User)
            .AsSplitQuery()
            .FirstOrDefaultAsync(t => t.Id == id) ?? throw new NotFoundException("المهمة غير موجودة");
        RefreshAggregate(task, today);
        if (!CanSee(user, task, canAssign)) throw new ForbiddenException("ليس لديك صلاحية عرض هذه المهمة.");
        return Map(task, user, canAssign, today, includeActivities: true);
    }

    public async Task<TaskDto> CreateAsync(TaskRequest request)
    {
        var user = await _current.RequireUserAsync();
        if (!_scope.CanAssignTasks(user)) throw new ForbiddenException("ليس لديك صلاحية إسناد المهام.");
        var assigneeIds = await ResolveAssigneeIdsAsync(user, request);
        var task = new TaskItem { CreatedById = user.Id, CreatedBy = user, Status = TaskStatus.NEW };
        await ApplyMetaAsync(task, request);
        AttachAssignees(task, assigneeIds);
        AddActivity(task, user, "CREATED", "تم إنشاء المهمة", null, TaskStatus.NEW, null);
        AddActivity(task, user, "ASSIGNED", $"تم الإسناد إلى {task.Assignee}", null, TaskStatus.NEW, null);
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        await NotifyUsersAsync(assigneeIds, task.Id, $"تم إسناد مهمة جديدة إليك «{task.Title}» بواسطة {user.FullName}.");
        await _db.SaveChangesAsync();
        return await FindByIdAsync(task.Id);
    }

    public async Task<TaskDto> UpdateAsync(long id, TaskRequest request)
    {
        var user = await _current.RequireUserAsync();
        var task = await RequireTrackedAsync(id);
        if (task.CreatedById != user.Id) throw new ForbiddenException("لا يمكن تعديل مهمة لم تسندها.");
        if (!TaskRules.CanEdit(task.Status)) throw new AppException("لا يمكن تعديل المهمة في حالتها الحالية.");
        var previous = task.Status;
        var assigneeIds = request.AssigneeIds is { Count: > 0 }
            ? await ResolveAssigneeIdsAsync(user, request)
            : task.Assignees.Select(a => a.UserId).ToList();
        await ApplyMetaAsync(task, request);
        if (request.AssigneeIds is { Count: > 0 })
        {
            var oldIds = task.Assignees.Select(a => a.UserId).OrderBy(x => x).ToList();
            var newIds = assigneeIds.OrderBy(x => x).ToList();
            if (!oldIds.SequenceEqual(newIds))
            {
                _db.TaskAssignees.RemoveRange(task.Assignees);
                task.Assignees.Clear();
                AttachAssignees(task, assigneeIds);
                AddActivity(task, user, "REASSIGNED", $"أُعيد الإسناد إلى {task.Assignee}", previous, task.Status, null);
                await NotifyUsersAsync(assigneeIds, task.Id, $"أُسندت إليك المهمة «{task.Title}» بواسطة {user.FullName}.");
            }
        }
        AddActivity(task, user, "UPDATED", "تم تحديث المهمة", previous, task.Status, null);
        await _db.SaveChangesAsync();
        return await FindByIdAsync(id);
    }

    public async Task<TaskDto> StartAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var task = await RequireTrackedAsync(id);
        var row = RequireMyAssignee(task, user.Id);
        if (!TaskRules.CanStart(row.Status)) throw new AppException("لا يمكن بدء المهمة في حالتها الحالية.");
        var previous = row.Status;
        row.Status = TaskStatus.IN_PROGRESS;
        row.StartedAt ??= DateTime.UtcNow;
        RefreshAggregate(task, DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3)));
        AddActivity(task, user, "STARTED", "بدأ تنفيذ المهمة", previous, TaskStatus.IN_PROGRESS, null);
        await _db.SaveChangesAsync();
        return await FindByIdAsync(id);
    }

    public async Task<TaskDto> CompleteAsync(long id, string? comment)
    {
        var user = await _current.RequireUserAsync();
        var task = await RequireTrackedAsync(id);
        var row = RequireMyAssignee(task, user.Id);
        if (!TaskRules.CanComplete(row.Status)) throw new AppException("لا يمكن إكمال المهمة في حالتها الحالية.");
        var previous = row.Status;
        row.Status = TaskStatus.COMPLETED;
        row.CompletedAt = DateTime.UtcNow;
        row.CompletionComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        RefreshAggregate(task, DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3)));
        AddActivity(task, user, "COMPLETED", "تم إكمال المهمة", previous, TaskStatus.COMPLETED, row.CompletionComment);
        if (task.CreatedById != null && task.CreatedById != user.Id)
            await NotifyUsersAsync([task.CreatedById.Value], task.Id, $"قام {user.FullName} بإكمال مهمة «{task.Title}».");
        await _db.SaveChangesAsync();
        return await FindByIdAsync(id);
    }

    public async Task<TaskDto> CancelAsync(long id, string? reason)
    {
        var user = await _current.RequireUserAsync();
        var task = await RequireTrackedAsync(id);
        if (task.CreatedById != user.Id) throw new ForbiddenException("لا يمكن إلغاء مهمة لم تسندها.");
        if (!TaskRules.CanCancel(task.Status)) throw new AppException("لا يمكن إلغاء المهمة في حالتها الحالية.");
        var previous = task.Status;
        task.Status = TaskStatus.CANCELLED;
        task.CancelReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        foreach (var row in task.Assignees.Where(a => a.Status != TaskStatus.COMPLETED))
            row.Status = TaskStatus.CANCELLED;
        AddActivity(task, user, "CANCELLED", "تم إلغاء المهمة", previous, TaskStatus.CANCELLED, task.CancelReason);
        var recipients = task.Assignees.Select(a => a.UserId).Where(idUser => idUser != user.Id).Distinct().ToList();
        await NotifyUsersAsync(recipients, task.Id, $"أُلغيت المهمة «{task.Title}» بواسطة {user.FullName}.");
        await _db.SaveChangesAsync();
        return await FindByIdAsync(id);
    }

    public async Task<TaskDto> CommentAsync(long id, string? comment)
    {
        var user = await _current.RequireUserAsync();
        if (string.IsNullOrWhiteSpace(comment)) throw new AppException("التعليق مطلوب.");
        var task = await RequireTrackedAsync(id);
        var canAssign = _scope.CanAssignTasks(user);
        if (!CanSee(user, task, canAssign)) throw new ForbiddenException("ليس لديك صلاحية التعليق على هذه المهمة.");
        AddActivity(task, user, "COMMENT", "تعليق", null, null, comment.Trim());
        await _db.SaveChangesAsync();
        return await FindByIdAsync(id);
    }

    public async Task DeleteAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var task = await RequireTrackedAsync(id);
        if (task.CreatedById != user.Id && !_scope.IsLeadership(user))
            throw new ForbiddenException("لا يمكن حذف هذه المهمة.");
        if (task.Assignees.Any(a => a.Status is TaskStatus.IN_PROGRESS or TaskStatus.COMPLETED))
            throw new AppException("لا يمكن حذف مهمة بدأ تنفيذها. استخدم الإلغاء بدلاً من ذلك.");
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
    }

    public async Task<List<TaskNoticeDto>> MyNoticesAsync()
    {
        var user = await _current.RequireUserAsync();
        return await _db.TaskNotices.AsNoTracking()
            .Where(n => n.UserId == user.Id && n.ReadAt == null)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new TaskNoticeDto { Id = n.Id, TaskId = n.TaskId, Message = n.Message })
            .ToListAsync();
    }

    public async Task MarkNoticeReadAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var notice = await _db.TaskNotices.FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.Id)
            ?? throw new NotFoundException("التنبيه غير موجود.");
        notice.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<List<long>> ResolveAssigneeIdsAsync(User assigner, TaskRequest request)
    {
        var ids = (request.AssigneeIds ?? []).Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0) throw new AppException("يجب اختيار مكلف واحد على الأقل.");
        foreach (var id in ids)
        {
            if (!await _scope.CanAssignToAsync(assigner, id))
                throw new ForbiddenException("لا يمكن إسناد المهمة إلى مستخدم خارج نطاق صلاحيتك التنظيمية.");
        }
        var active = await _db.Users.AsNoTracking().Where(u => ids.Contains(u.Id) && u.Active).Select(u => u.Id).ToListAsync();
        if (active.Count != ids.Count) throw new AppException("أحد المكلفين غير نشط أو غير موجود.");
        return ids;
    }

    private void AttachAssignees(TaskItem task, List<long> assigneeIds)
    {
        var users = _db.Users.AsNoTracking().Where(u => assigneeIds.Contains(u.Id)).ToList();
        foreach (var id in assigneeIds)
        {
            task.Assignees.Add(new TaskAssignee { UserId = id, Status = TaskStatus.NEW });
        }
        task.AssignedToId = assigneeIds[0];
        task.Assignee = string.Join("، ", users.OrderBy(u => assigneeIds.IndexOf(u.Id)).Select(u => u.FullName));
        task.Status = TaskStatus.NEW;
    }

    private async Task ApplyMetaAsync(TaskItem task, TaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 200)
            throw new AppException("عنوان المهمة مطلوب ولا يتجاوز 200 حرفاً.");
        if (string.IsNullOrWhiteSpace(request.Description))
            throw new AppException("وصف المهمة مطلوب.");
        if (request.Description.Trim().Length > 1000)
            throw new AppException("الوصف يتجاوز الحد المسموح.");
        task.Title = request.Title.Trim();
        task.Description = request.Description.Trim();
        task.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        task.DueDate = ParseDate(request.DueDate);
        if (!string.IsNullOrWhiteSpace(request.Priority))
        {
            task.Priority = Enum.TryParse<TaskPriority>(request.Priority, true, out var priority)
                ? priority : throw new AppException("الأولوية غير صحيحة");
        }

        if (request.MeetingId != null)
            task.MeetingId = await _db.Meetings.AnyAsync(m => m.Id == request.MeetingId) ? request.MeetingId : null;
        else if (!string.IsNullOrWhiteSpace(request.MeetingTitle))
        {
            var title = request.MeetingTitle.Trim();
            task.MeetingId = await _db.Meetings.Where(m => m.Title == title).Select(m => (long?)m.Id).FirstOrDefaultAsync();
        }
    }

    private static DateOnly? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var raw = value.Length >= 10 ? value[..10] : value;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : throw new AppException("تاريخ الاستحقاق غير صحيح");
    }

    private IQueryable<TaskItem> QueryBase() =>
        _db.Tasks.AsNoTracking()
            .Include(t => t.Meeting)
            .Include(t => t.CreatedBy)
            .Include(t => t.Assignees).ThenInclude(a => a.User)
            .AsSplitQuery();

    private async Task<TaskItem> RequireAsync(long id) =>
        await QueryBase().FirstOrDefaultAsync(t => t.Id == id) ?? throw new NotFoundException("المهمة غير موجودة");

    private async Task<TaskItem> RequireTrackedAsync(long id) =>
        await _db.Tasks
            .Include(t => t.Assignees)
            .Include(t => t.Activities)
            .FirstOrDefaultAsync(t => t.Id == id) ?? throw new NotFoundException("المهمة غير موجودة");

    private static TaskAssignee RequireMyAssignee(TaskItem task, long userId) =>
        task.Assignees.FirstOrDefault(a => a.UserId == userId)
        ?? throw new ForbiddenException("هذه المهمة غير مسندة إليك.");

    private static bool IsAssignee(TaskItem task, long userId) =>
        task.Assignees.Any(a => a.UserId == userId);

    private static bool CanSee(User user, TaskItem task, bool canAssign)
    {
        if (task.CreatedById == user.Id) return true;
        if (IsAssignee(task, user.Id)) return true;
        if (task.AssignedToId == user.Id) return true;
        if (canAssign && task.Assignees.Count == 0) return true; // legacy free-text rows for managers
        return false;
    }

    private static void RefreshAggregate(TaskItem task, DateOnly today)
    {
        if (task.Status == TaskStatus.CANCELLED) return;
        if (task.Assignees.Count > 0)
            task.Status = TaskRules.AggregateStatus(task.Assignees.Select(a => a.Status).ToList());
        var display = TaskRules.DisplayStatus(task.Status, task.DueDate, today);
        if (display == TaskStatus.OVERDUE) task.Status = TaskStatus.OVERDUE;
    }

    private static TaskStatus EffectiveStatus(TaskItem task, DateOnly today, User user)
    {
        if (IsAssignee(task, user.Id))
        {
            var mine = task.Assignees.First(a => a.UserId == user.Id).Status;
            return TaskRules.DisplayStatus(mine, task.DueDate, today);
        }
        return TaskRules.DisplayStatus(task.Status, task.DueDate, today);
    }

    private TaskSummaryDto BuildSummary(List<TaskItem> rows, DateOnly today, User user)
    {
        var statuses = rows.Select(t => EffectiveStatus(t, today, user)).ToList();
        return new TaskSummaryDto
        {
            Total = rows.Count,
            NewCount = statuses.Count(s => s == TaskStatus.NEW),
            InProgress = statuses.Count(s => s == TaskStatus.IN_PROGRESS),
            Overdue = statuses.Count(s => s == TaskStatus.OVERDUE),
            Completed = statuses.Count(s => s == TaskStatus.COMPLETED)
        };
    }

    private TaskDto Map(TaskItem t, User user, bool canAssign, DateOnly today, bool includeActivities)
    {
        var myRow = t.Assignees.FirstOrDefault(a => a.UserId == user.Id);
        var status = EffectiveStatus(t, today, user);
        var isCreator = t.CreatedById == user.Id;
        return new TaskDto
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Assignee = t.Assignee,
            AssignedByName = t.CreatedBy?.FullName,
            AssignedById = t.CreatedById,
            DueDate = t.DueDate?.ToString("yyyy-MM-dd"),
            Priority = t.Priority.ToString(),
            PriorityLabel = TaskRules.PriorityLabel(t.Priority),
            Status = status.ToString(),
            StatusLabel = TaskRules.StatusLabel(status),
            Notes = t.Notes,
            MeetingId = t.MeetingId,
            MeetingTitle = t.Meeting?.Title,
            CreatedAt = t.CreatedAt,
            CompletedCount = t.Assignees.Count(a => a.Status == TaskStatus.COMPLETED),
            AssigneeCount = t.Assignees.Count,
            CanEdit = isCreator && TaskRules.CanEdit(t.Status == TaskStatus.OVERDUE ? TaskStatus.IN_PROGRESS : t.Status),
            CanCancel = isCreator && TaskRules.CanCancel(t.Status == TaskStatus.OVERDUE ? TaskStatus.IN_PROGRESS : t.Status),
            CanStart = myRow != null && TaskRules.CanStart(myRow.Status),
            CanComplete = myRow != null && TaskRules.CanComplete(myRow.Status),
            CanComment = isCreator || myRow != null,
            Assignees = t.Assignees.Select(a => new TaskAssigneeDto
            {
                UserId = a.UserId,
                FullName = a.User?.FullName ?? "",
                Status = TaskRules.DisplayStatus(a.Status, t.DueDate, today).ToString(),
                StatusLabel = TaskRules.StatusLabel(TaskRules.DisplayStatus(a.Status, t.DueDate, today)),
                CompletedAt = a.CompletedAt,
                CompletionComment = a.CompletionComment
            }).ToList(),
            Activities = includeActivities
                ? t.Activities.OrderBy(e => e.CreatedAt).Select(e => new TaskActivityDto
                {
                    Action = e.Action,
                    ActionLabel = e.ActionLabel,
                    UserName = e.User?.FullName ?? "",
                    RoleLabel = e.RoleLabel,
                    At = e.CreatedAt,
                    Comment = e.Comment
                }).ToList()
                : null
        };
    }

    private void AddActivity(TaskItem task, User user, string action, string label, TaskStatus? previous, TaskStatus? next, string? comment)
    {
        task.Activities.Add(new TaskActivity
        {
            Task = task,
            UserId = user.Id,
            User = user,
            Action = action,
            ActionLabel = label,
            RoleLabel = RoleLabel(user),
            Comment = comment,
            PreviousStatus = previous,
            NewStatus = next
        });
    }

    private async Task NotifyUsersAsync(IEnumerable<long> userIds, long taskId, string message)
    {
        foreach (var userId in userIds.Distinct())
            _db.TaskNotices.Add(new TaskNotice { UserId = userId, TaskId = taskId, Message = message });
        await Task.CompletedTask;
    }

    private static string RoleLabel(User user)
    {
        var roles = user.Roles.Select(r => r.RoleKey).ToList();
        if (roles.Any(r => r.StartsWith("DEPARTMENT_HEAD"))) return "رئيس الشعبة";
        if (roles.Contains("SCHOOL_MANAGER")) return "مدير المدرسة";
        if (roles.Contains("ASSISTANT_MANAGER")) return "وكيل المدرسة";
        if (roles.Contains("ADMIN")) return "مدير النظام";
        if (roles.Contains("TEACHER")) return "المعلم";
        return "مستخدم";
    }
}
