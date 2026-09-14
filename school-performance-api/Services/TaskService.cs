using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using TaskStatus = SchoolPerformance.Api.Entities.TaskStatus;

namespace SchoolPerformance.Api.Services;

public class TaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TaskDto>> FindAllAsync()
    {
        var tasks = await _db.Tasks.Include(t => t.Meeting).OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate).ThenByDescending(t => t.Id).ToListAsync();
        return tasks.Select(ToDto).ToList();
    }

    public async Task<TaskDto> FindByIdAsync(long id) => ToDto(await RequireAsync(id));

    public async Task<TaskDto> CreateAsync(User user, TaskRequest request)
    {
        var task = new TaskItem { CreatedById = user.Id };
        await ApplyAsync(task, request);
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return ToDto(await RequireAsync(task.Id));
    }

    public async Task<TaskDto> UpdateAsync(long id, TaskRequest request)
    {
        var task = await RequireAsync(id);
        await ApplyAsync(task, request);
        await _db.SaveChangesAsync();
        return ToDto(await RequireAsync(id));
    }

    public async Task DeleteAsync(long id)
    {
        var task = await RequireAsync(id);
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
    }

    private async Task ApplyAsync(TaskItem task, TaskRequest request)
    {
        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.Assignee = request.Assignee;
        task.DueDate = ParseDate(request.DueDate);
        if (!string.IsNullOrWhiteSpace(request.Priority))
        {
            task.Priority = Enum.TryParse<TaskPriority>(request.Priority, true, out var priority) ? priority : throw new AppException("الأولوية غير صحيحة");
        }
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            task.Status = Enum.TryParse<TaskStatus>(request.Status, true, out var status) ? status : throw new AppException("حالة المهمة غير صحيحة");
        }

        // Link to a meeting by id, or by exact title when the UI only knows the name.
        if (request.MeetingId != null)
        {
            task.MeetingId = await _db.Meetings.AnyAsync(m => m.Id == request.MeetingId) ? request.MeetingId : null;
        }
        else if (!string.IsNullOrWhiteSpace(request.MeetingTitle))
        {
            var title = request.MeetingTitle.Trim();
            task.MeetingId = await _db.Meetings.Where(m => m.Title == title).Select(m => (long?)m.Id).FirstOrDefaultAsync();
        }
        else
        {
            task.MeetingId = null;
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

    private static TaskDto ToDto(TaskItem t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Description = t.Description,
        Assignee = t.Assignee,
        DueDate = t.DueDate?.ToString("yyyy-MM-dd"),
        Priority = t.Priority.ToString(),
        Status = t.Status.ToString(),
        MeetingId = t.MeetingId,
        MeetingTitle = t.Meeting?.Title
    };

    private async Task<TaskItem> RequireAsync(long id) =>
        await _db.Tasks.Include(t => t.Meeting).FirstOrDefaultAsync(t => t.Id == id) ?? throw new NotFoundException("المهمة غير موجودة");
}
