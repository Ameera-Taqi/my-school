using System.Data;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Security;

namespace SchoolPerformance.Api.Services;

public class RecordService
{
    private readonly AppDbContext _db;
    private readonly CurrentUserService _current;
    private readonly DepartmentHeadScopeService _heads;

    public RecordService(AppDbContext db, CurrentUserService current, DepartmentHeadScopeService heads)
    {
        _db = db;
        _current = current;
        _heads = heads;
    }

    public async Task<List<RecordCategoryDto>> CategoriesAsync()
    {
        await _current.RequireUserAsync();
        return await _db.RecordCategories.AsNoTracking()
            .Where(c => c.Active)
            .OrderBy(c => c.Name)
            .Select(c => new RecordCategoryDto { Id = c.Id, Name = c.Name })
            .ToListAsync();
    }

    public async Task<RecordListResponse> ListAsync(string? view, string? query, string? status, long? categoryId)
    {
        var user = await _current.RequireUserAsync();
        var scope = await ScopeAsync(user);
        var rows = await _db.StaffRecords.AsNoTracking()
            .Include(r => r.Owner)
            .Include(r => r.Category)
            .Include(r => r.Events)
            .AsSplitQuery()
            .ToListAsync();
        await AttachFileMetaAsync(rows);
        var visible = rows.Where(r => CanSee(user, scope, r)).ToList();
        var summary = new RecordSummaryDto
        {
            Total = visible.Count,
            Pending = visible.Count(r => r.Status == RecordStatus.PendingApproval),
            Approved = visible.Count(r => r.Status == RecordStatus.Approved),
            Returned = visible.Count(r => r.Status == RecordStatus.ReturnedForRevision)
        };
        IEnumerable<StaffRecord> filtered = view switch
        {
            "awaiting" => visible.Where(r => r.Status == RecordStatus.PendingApproval && CanDecide(user, scope, r)),
            "approved" => visible.Where(r => r.Events.Any(e => e.Action == "APPROVED" && e.UserId == user.Id)),
            "returned" => visible.Where(r => r.Status == RecordStatus.ReturnedForRevision && (r.OwnerUserId == user.Id || r.Events.Any(e => e.Action == "RETURNED" && e.UserId == user.Id))),
            "all" => visible,
            _ => visible.Where(r => r.OwnerUserId == user.Id)
        };
        if (categoryId != null) filtered = filtered.Where(r => r.CategoryId == categoryId);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RecordStatus>(status, out var parsed))
            filtered = filtered.Where(r => r.Status == parsed);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim();
            filtered = filtered.Where(r =>
                r.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                || Number(r.Id).Contains(q, StringComparison.OrdinalIgnoreCase)
                || (r.Owner?.FullName.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false));
        }
        return new RecordListResponse
        {
            Summary = summary,
            Items = filtered.OrderByDescending(r => r.UpdatedAt).Select(r => MapItem(r, user, scope)).ToList()
        };
    }

    public async Task<RecordDetailDto> DetailAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var scope = await ScopeAsync(user);
        var record = await LoadAsync(id);
        if (!CanSee(user, scope, record)) throw new ForbiddenException("ليس لديك صلاحية عرض هذا السجل.");
        var item = MapItem(record, user, scope);
        return new RecordDetailDto
        {
            Id = item.Id, Number = item.Number, Name = item.Name, CategoryName = item.CategoryName, CategoryId = item.CategoryId,
            Description = item.Description, FileName = item.FileName, ContentType = item.ContentType, CanPreview = item.CanPreview,
            UploadedAt = item.UploadedAt, UpdatedAt = item.UpdatedAt, Status = item.Status, StatusLabel = item.StatusLabel,
            AuthorityLabel = item.AuthorityLabel, OwnerName = item.OwnerName, CanEdit = item.CanEdit, CanDelete = item.CanDelete,
            CanSubmit = item.CanSubmit, CanCancel = item.CanCancel, CanDecide = item.CanDecide, RowVersion = item.RowVersion,
            Events = record.Events.OrderBy(e => e.CreatedAt).Select(e => new RecordEventDto
            {
                Action = e.Action,
                ActionLabel = e.ActionLabel,
                UserName = e.User?.FullName ?? "",
                RoleLabel = e.RoleLabel,
                At = e.CreatedAt,
                Comment = e.Comment
            }).ToList()
        };
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> FileAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var scope = await ScopeAsync(user);
        var record = await LoadAsync(id);
        if (!CanSee(user, scope, record)) throw new ForbiddenException("ليس لديك صلاحية فتح هذا الملف.");
        var file = await _db.RecordFiles.AsNoTracking().FirstOrDefaultAsync(f => f.RecordId == id);
        if (file == null || file.Content.Length == 0) throw new NotFoundException("الملف غير موجود.");
        return (file.Content, file.ContentType, file.FileName);
    }

    public async Task<RecordDetailDto> CreateAsync(string name, long categoryId, string? description, string fileName, byte[] content)
    {
        var user = await RequireManageAsync();
        ValidateMeta(name, description);
        var problem = RecordRules.FileProblem(fileName, content);
        if (problem != null) throw new AppException(problem);
        var category = await ActiveCategoryAsync(categoryId);
        var record = new StaffRecord
        {
            OwnerUserId = user.Id,
            Owner = user,
            CategoryId = category.Id,
            Category = category,
            Name = name.Trim(),
            Description = Clean(description),
            Status = RecordStatus.Draft,
            File = new RecordFile
            {
                FileName = Path.GetFileName(fileName),
                ContentType = RecordRules.ContentTypeFor(fileName),
                Size = content.Length,
                Content = content
            }
        };
        AddEvent(record, user, "CREATED", "تم إنشاء السجل", null, RecordStatus.Draft, null);
        AddEvent(record, user, "FILE_UPLOADED", "تم رفع الملف", null, RecordStatus.Draft, null);
        _db.StaffRecords.Add(record);
        await _db.SaveChangesAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<RecordDetailDto> UpdateAsync(long id, string name, long categoryId, string? description, string? rowVersion, string? fileName, byte[]? content)
    {
        var user = await RequireManageAsync();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var record = await LoadTrackedAsync(id);
        if (record.OwnerUserId != user.Id) throw new ForbiddenException("لا يمكن تعديل سجل لا تملكه.");
        if (!RecordRules.CanEdit(record.Status)) throw new AppException("لا يمكن تعديل السجل في حالته الحالية.");
        EnsureVersion(record, rowVersion);
        ValidateMeta(name, description);
        var category = await ActiveCategoryAsync(categoryId);
        var previous = record.Status;
        record.Name = name.Trim();
        record.Description = Clean(description);
        record.CategoryId = category.Id;
        if (content != null)
        {
            var problem = RecordRules.FileProblem(fileName, content);
            if (problem != null) throw new AppException(problem);
            record.File ??= new RecordFile { RecordId = record.Id };
            record.File.FileName = Path.GetFileName(fileName!);
            record.File.ContentType = RecordRules.ContentTypeFor(fileName!);
            record.File.Size = content.Length;
            record.File.Content = content;
            AddEvent(record, user, "FILE_REPLACED", "تم تحديث الملف", previous, record.Status, null);
        }
        AddEvent(record, user, "UPDATED", "تم تحديث السجل", previous, record.Status, null);
        await SaveAsync();
        await tx.CommitAsync();
        return await DetailAsync(record.Id);
    }

    public async Task DeleteAsync(long id)
    {
        var user = await RequireManageAsync();
        var record = await LoadTrackedAsync(id);
        if (record.OwnerUserId != user.Id) throw new ForbiddenException("لا يمكن حذف سجل لا تملكه.");
        if (!RecordRules.CanDelete(record.Status)) throw new AppException("لا يمكن حذف السجل في حالته الحالية.");
        _db.StaffRecords.Remove(record);
        await _db.SaveChangesAsync();
    }

    public async Task<RecordDetailDto> SubmitAsync(long id)
    {
        var user = await RequireManageAsync();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var record = await LoadTrackedAsync(id);
        if (record.OwnerUserId != user.Id) throw new ForbiddenException("لا يمكن إرسال سجل لا تملكه.");
        if (!user.Active) throw new AppException("الحساب غير نشط.");
        if (!RecordRules.CanSubmit(record.Status)) throw new AppException("يوجد طلب اعتماد قائم لهذا السجل.");
        var isHead = _heads.IsDepartmentHeadUser(user);
        var leadership = IsLeadership(user);
        var teacher = await _db.Teachers.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == user.Id && t.Active);
        var departmentId = isHead ? await _heads.ResolveDepartmentIdAsync(user) : teacher?.DepartmentId;
        var heads = departmentId == null ? 0 : await ActiveHeadCountAsync(departmentId.Value, user.Id);
        var route = RecordRules.RouteFor(isHead, leadership, departmentId, heads, out var error);
        if (route == null) throw new AppException(error!);
        var previous = record.Status;
        record.Status = RecordStatus.PendingApproval;
        record.ApprovalLevel = route.Level;
        record.DepartmentId = departmentId;
        record.AuthorityLabel = route.AuthorityLabel;
        AddEvent(record, user, "SUBMITTED", "تم الإرسال للاعتماد", previous, record.Status, null);
        await SaveAsync();
        await NotifyApproversAsync(record, user, $"سجل «{record.Name}» بانتظار اعتمادك.");
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await DetailAsync(record.Id);
    }

    public Task<RecordDetailDto> ApproveAsync(long id, string? comment) =>
        DecideAsync(id, RecordStatus.Approved, "APPROVED", "تم الاعتماد", comment, required: false);

    public Task<RecordDetailDto> RejectAsync(long id, string? comment) =>
        DecideAsync(id, RecordStatus.Rejected, "REJECTED", "تم الرفض", comment, required: true);

    public Task<RecordDetailDto> ReturnAsync(long id, string? comment) =>
        DecideAsync(id, RecordStatus.ReturnedForRevision, "RETURNED", "أُعيد للتعديل", comment, required: true);

    public async Task<RecordDetailDto> CancelAsync(long id)
    {
        var user = await RequireManageAsync();
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var record = await LoadTrackedAsync(id);
        if (record.OwnerUserId != user.Id) throw new ForbiddenException("لا يمكن إلغاء سجل لا تملكه.");
        if (!RecordRules.CanCancel(record.Status)) throw new AppException("لا يمكن إلغاء السجل في حالته الحالية.");
        var previous = record.Status;
        record.Status = RecordStatus.Cancelled;
        record.ApprovalLevel = RecordApprovalLevel.None;
        record.AuthorityLabel = null;
        AddEvent(record, user, "CANCELLED", "تم إلغاء طلب الاعتماد", previous, record.Status, null);
        await SaveAsync();
        await tx.CommitAsync();
        return await DetailAsync(record.Id);
    }

    public async Task<List<RecordNoticeDto>> MyNoticesAsync()
    {
        var user = await _current.RequireUserAsync();
        return await _db.RecordNotices.AsNoTracking()
            .Where(n => n.UserId == user.Id && n.ReadAt == null)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new RecordNoticeDto { Id = n.Id, RecordId = n.RecordId, Message = n.Message })
            .ToListAsync();
    }

    public async Task MarkNoticeReadAsync(long id)
    {
        var user = await _current.RequireUserAsync();
        var notice = await _db.RecordNotices.FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.Id)
            ?? throw new NotFoundException("التنبيه غير موجود.");
        notice.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<RecordDetailDto> DecideAsync(long id, RecordStatus next, string action, string label, string? comment, bool required)
    {
        var user = await _current.RequireUserAsync();
        var scope = await ScopeAsync(user);
        if (!scope.CanApprove) throw new ForbiddenException("ليس لديك صلاحية اعتماد السجلات.");
        var text = comment?.Trim();
        if (required && string.IsNullOrWhiteSpace(text)) throw new AppException("سبب القرار مطلوب.");
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var record = await LoadTrackedAsync(id);
        if (record.Status != RecordStatus.PendingApproval) throw new AppException("هذا السجل لم يعد بانتظار الاعتماد.");
        if (!CanDecide(user, scope, record))
            throw new ForbiddenException("لا يمكنك اعتماد سجلك أو سجل خارج نطاقك.");
        var previous = record.Status;
        record.Status = next;
        if (next != RecordStatus.PendingApproval)
        {
            record.AuthorityLabel = next == RecordStatus.Approved ? null : record.AuthorityLabel;
        }
        AddEvent(record, user, action, label, previous, next, text);
        await SaveAsync();
        if (record.OwnerUserId != user.Id)
        {
            _db.RecordNotices.Add(new RecordNotice
            {
                UserId = record.OwnerUserId,
                RecordId = record.Id,
                Message = $"السجل «{record.Name}»: {label}."
            });
            await _db.SaveChangesAsync();
        }
        await tx.CommitAsync();
        return await DetailAsync(record.Id);
    }

    private async Task NotifyApproversAsync(StaffRecord record, User actor, string message)
    {
        var recipients = record.ApprovalLevel == RecordApprovalLevel.Department
            ? await DepartmentHeadUserIdsAsync(record.DepartmentId, actor.Id)
            : await LeadershipUserIdsAsync(actor.Id);
        if (recipients.Count == 0) throw new AppException("لا يوجد معتمد نشط لاستلام هذا السجل.");
        foreach (var userId in recipients)
        {
            _db.RecordNotices.Add(new RecordNotice { UserId = userId, RecordId = record.Id, Message = message });
        }
    }

    private async Task<List<long>> DepartmentHeadUserIdsAsync(long? departmentId, long exceptUserId)
    {
        if (departmentId == null) return [];
        var teachers = await _db.Teachers.AsNoTracking()
            .Include(t => t.User!).ThenInclude(u => u.Roles)
            .Where(t => t.Active && t.DepartmentId == departmentId && t.UserId != null && t.UserId != exceptUserId && t.User!.Active)
            .ToListAsync();
        return teachers.Where(t => t.User != null && _heads.IsDepartmentHeadUser(t.User)).Select(t => t.UserId!.Value).Distinct().ToList();
    }

    private async Task<List<long>> LeadershipUserIdsAsync(long exceptUserId)
    {
        var users = await _db.Users.AsNoTracking().Include(u => u.Roles)
            .Where(u => u.Active && u.Id != exceptUserId)
            .ToListAsync();
        return users.Where(IsLeadership).Select(u => u.Id).ToList();
    }

    private async Task<int> ActiveHeadCountAsync(long departmentId, long exceptUserId) =>
        (await DepartmentHeadUserIdsAsync(departmentId, exceptUserId)).Count;

    private async Task<User> RequireManageAsync()
    {
        var user = await _current.RequireUserAsync();
        if (!await _current.HasPermissionAsync(Perms.RecordsManage)) throw new ForbiddenException("ليس لديك صلاحية إدارة السجلات.");
        return user;
    }

    private async Task<StaffRecord> LoadAsync(long id)
    {
        var record = await _db.StaffRecords.AsNoTracking()
            .Include(r => r.Owner)
            .Include(r => r.Category)
            .Include(r => r.Events).ThenInclude(e => e.User)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id) ?? throw new NotFoundException("السجل غير موجود.");
        await AttachFileMetaAsync([record]);
        return record;
    }

    private async Task AttachFileMetaAsync(IReadOnlyCollection<StaffRecord> records)
    {
        var ids = records.Select(r => r.Id).ToList();
        if (ids.Count == 0) return;
        var files = await _db.RecordFiles.AsNoTracking()
            .Where(f => ids.Contains(f.RecordId))
            .Select(f => new { f.RecordId, f.FileName, f.ContentType })
            .ToListAsync();
        foreach (var record in records)
        {
            var file = files.FirstOrDefault(f => f.RecordId == record.Id);
            if (file == null) continue;
            record.File = new RecordFile { RecordId = record.Id, FileName = file.FileName, ContentType = file.ContentType };
        }
    }

    private async Task<StaffRecord> LoadTrackedAsync(long id) =>
        await _db.StaffRecords
            .Include(r => r.File)
            .Include(r => r.Events)
            .FirstOrDefaultAsync(r => r.Id == id) ?? throw new NotFoundException("السجل غير موجود.");

    private async Task<RecordCategory> ActiveCategoryAsync(long id) =>
        await _db.RecordCategories.FirstOrDefaultAsync(c => c.Id == id && c.Active)
        ?? throw new AppException("نوع السجل غير متاح.");

    private static void ValidateMeta(string name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 200) throw new AppException("اسم السجل مطلوب ولا يتجاوز 200 حرفاً.");
        if (description != null && description.Trim().Length > 1000) throw new AppException("الوصف يتجاوز الحد المسموح.");
    }

    private static string? Clean(string? value)
    {
        var text = value?.Trim();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static void EnsureVersion(StaffRecord record, string? rowVersion)
    {
        if (string.IsNullOrWhiteSpace(rowVersion)) return;
        byte[] sent;
        try { sent = Convert.FromBase64String(rowVersion); }
        catch (FormatException) { throw new AppException("تعذر حفظ السجل لأن بياناته تغيرت. حدّث الصفحة."); }
        if (!sent.SequenceEqual(record.RowVersion)) throw new AppException("تعذر حفظ السجل لأن بياناته تغيرت. حدّث الصفحة.");
    }

    private async Task SaveAsync()
    {
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw new AppException("تعذر حفظ السجل لأن بياناته تغيرت. حدّث الصفحة."); }
    }

    private void AddEvent(StaffRecord record, User user, string action, string label, RecordStatus? previous, RecordStatus? next, string? comment)
    {
        record.Events.Add(new RecordEvent
        {
            Record = record,
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

    private RecordListItemDto MapItem(StaffRecord record, User user, Scope scope)
    {
        var decide = CanDecide(user, scope, record);
        return new RecordListItemDto
        {
            Id = record.Id,
            Number = Number(record.Id),
            Name = record.Name,
            CategoryId = record.CategoryId,
            CategoryName = record.Category?.Name ?? "",
            Description = record.Description,
            FileName = record.File?.FileName,
            ContentType = record.File?.ContentType,
            CanPreview = record.File != null && RecordRules.CanPreview(record.File.ContentType),
            UploadedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt,
            Status = record.Status.ToString(),
            StatusLabel = RecordRules.StatusLabel(record.Status, record.ApprovalLevel),
            AuthorityLabel = record.Status == RecordStatus.PendingApproval ? record.AuthorityLabel : null,
            OwnerName = record.Owner?.FullName ?? "",
            CanEdit = record.OwnerUserId == user.Id && RecordRules.CanEdit(record.Status),
            CanDelete = record.OwnerUserId == user.Id && RecordRules.CanDelete(record.Status),
            CanSubmit = record.OwnerUserId == user.Id && RecordRules.CanSubmit(record.Status),
            CanCancel = record.OwnerUserId == user.Id && RecordRules.CanCancel(record.Status),
            CanDecide = decide,
            RowVersion = Convert.ToBase64String(record.RowVersion)
        };
    }

    private bool CanDecide(User user, Scope scope, StaffRecord record) =>
        record.Status == RecordStatus.PendingApproval
        && scope.CanApprove
        && RecordRules.CanDecide(user.Id, record.OwnerUserId, InScope(user, scope, record));

    private static bool CanSee(User user, Scope scope, StaffRecord record)
    {
        if (record.OwnerUserId == user.Id) return true;
        if (record.Status == RecordStatus.Draft) return false;
        if (record.Events.Any(e => e.UserId == user.Id)) return true;
        return InScope(user, scope, record);
    }

    private static bool InScope(User user, Scope scope, StaffRecord record)
    {
        if (record.ApprovalLevel == RecordApprovalLevel.Department)
            return scope.IsHead && scope.DepartmentId != null && record.DepartmentId == scope.DepartmentId && user.Id != record.OwnerUserId;
        if (record.ApprovalLevel == RecordApprovalLevel.Administration)
            return scope.IsLeadership && user.Id != record.OwnerUserId;
        return false;
    }

    private async Task<Scope> ScopeAsync(User user)
    {
        var departmentId = _heads.IsDepartmentHeadUser(user) ? await _heads.ResolveDepartmentIdAsync(user) : null;
        var canApprove = await _current.HasPermissionAsync(Perms.RecordsApprove);
        return new Scope(_heads.IsDepartmentHeadUser(user), IsLeadership(user), departmentId, canApprove);
    }

    private static bool IsLeadership(User user) =>
        user.Roles.Any(r => r.RoleKey is "SCHOOL_MANAGER" or "ASSISTANT_MANAGER" or "ADMIN");

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

    private static string Number(long id) => $"SR-{id:0000}";

    private sealed record Scope(bool IsHead, bool IsLeadership, long? DepartmentId, bool CanApprove);
}
