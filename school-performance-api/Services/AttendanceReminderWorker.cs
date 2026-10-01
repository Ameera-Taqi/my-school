namespace SchoolPerformance.Api.Services;

/// <summary>Sends the half-period attendance reminder even when nobody has the timetable open.</summary>
public class AttendanceReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<AttendanceReminderWorker> _logger;

    public AttendanceReminderWorker(IServiceScopeFactory scopes, ILogger<AttendanceReminderWorker> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(8), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<AttendanceService>().SweepHalfPeriodRemindersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Attendance reminder sweep failed");
            }
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
