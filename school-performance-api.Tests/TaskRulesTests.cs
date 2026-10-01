using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Services;
using TaskStatus = SchoolPerformance.Api.Entities.TaskStatus;
using Xunit;

namespace SchoolPerformance.Api.Tests;

public class TaskRulesTests
{
    [Fact]
    public void Overdue_is_computed_from_due_date_when_not_completed()
    {
        var today = new DateOnly(2026, 10, 1);
        Assert.Equal(TaskStatus.OVERDUE, TaskRules.DisplayStatus(TaskStatus.NEW, new DateOnly(2026, 9, 30), today));
        Assert.Equal(TaskStatus.NEW, TaskRules.DisplayStatus(TaskStatus.NEW, new DateOnly(2026, 10, 5), today));
        Assert.Equal(TaskStatus.COMPLETED, TaskRules.DisplayStatus(TaskStatus.COMPLETED, new DateOnly(2026, 9, 1), today));
    }

    [Fact]
    public void Aggregate_status_tracks_partial_completion()
    {
        Assert.Equal(TaskStatus.NEW, TaskRules.AggregateStatus([TaskStatus.NEW, TaskStatus.NEW]));
        Assert.Equal(TaskStatus.IN_PROGRESS, TaskRules.AggregateStatus([TaskStatus.COMPLETED, TaskStatus.NEW]));
        Assert.Equal(TaskStatus.COMPLETED, TaskRules.AggregateStatus([TaskStatus.COMPLETED, TaskStatus.COMPLETED]));
    }

    [Fact]
    public void Workflow_gates()
    {
        Assert.True(TaskRules.CanStart(TaskStatus.NEW));
        Assert.True(TaskRules.CanComplete(TaskStatus.IN_PROGRESS));
        Assert.False(TaskRules.CanCancel(TaskStatus.COMPLETED));
        Assert.False(TaskRules.CanEdit(TaskStatus.CANCELLED));
    }
}
