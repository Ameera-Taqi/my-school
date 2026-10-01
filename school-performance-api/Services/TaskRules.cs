using SchoolPerformance.Api.Entities;
using TaskStatus = SchoolPerformance.Api.Entities.TaskStatus;

namespace SchoolPerformance.Api.Services;

public static class TaskRules
{
    public static TaskStatus DisplayStatus(TaskStatus status, DateOnly? dueDate, DateOnly today)
    {
        if (status is TaskStatus.COMPLETED or TaskStatus.CANCELLED) return status;
        if (dueDate != null && dueDate < today) return TaskStatus.OVERDUE;
        return status;
    }

    public static TaskStatus AggregateStatus(IReadOnlyList<TaskStatus> assigneeStatuses)
    {
        if (assigneeStatuses.Count == 0) return TaskStatus.NEW;
        if (assigneeStatuses.All(s => s == TaskStatus.COMPLETED)) return TaskStatus.COMPLETED;
        if (assigneeStatuses.All(s => s == TaskStatus.CANCELLED)) return TaskStatus.CANCELLED;
        if (assigneeStatuses.Any(s => s == TaskStatus.IN_PROGRESS || s == TaskStatus.COMPLETED))
            return TaskStatus.IN_PROGRESS;
        return TaskStatus.NEW;
    }

    public static bool CanStart(TaskStatus status) =>
        status is TaskStatus.NEW or TaskStatus.OVERDUE;

    public static bool CanComplete(TaskStatus status) =>
        status is TaskStatus.NEW or TaskStatus.IN_PROGRESS or TaskStatus.OVERDUE;

    public static bool CanCancel(TaskStatus status) =>
        status is not TaskStatus.COMPLETED and not TaskStatus.CANCELLED;

    public static bool CanEdit(TaskStatus status) =>
        status is not TaskStatus.COMPLETED and not TaskStatus.CANCELLED;

    public static string StatusLabel(TaskStatus status) => status switch
    {
        TaskStatus.NEW => "جديدة",
        TaskStatus.IN_PROGRESS => "قيد التنفيذ",
        TaskStatus.COMPLETED => "مكتملة",
        TaskStatus.OVERDUE => "متأخرة",
        TaskStatus.CANCELLED => "ملغاة",
        _ => status.ToString()
    };

    public static string PriorityLabel(TaskPriority priority) => priority switch
    {
        TaskPriority.LOW => "منخفضة",
        TaskPriority.MEDIUM => "متوسطة",
        TaskPriority.HIGH => "عالية",
        TaskPriority.URGENT => "عاجلة",
        _ => priority.ToString()
    };
}
