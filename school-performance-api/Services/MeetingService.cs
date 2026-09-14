using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

/// <summary>Meetings, mirrored into the shared calendar when they target roles.</summary>
public class MeetingService
{
    private const string DateFormat = "yyyy-MM-dd'T'HH:mm";
    private readonly AppDbContext _db;

    public MeetingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<MeetingDto>> FindAllAsync()
    {
        var meetings = await Query().OrderByDescending(m => m.MeetingDate).ToListAsync();
        return meetings.Select(ToDto).ToList();
    }

    public async Task<MeetingDto> FindByIdAsync(long id) => ToDto(await RequireAsync(id));

    public async Task<MeetingDto> CreateAsync(User user, MeetingRequest request)
    {
        var meeting = new Meeting { OrganizerId = user.Id };
        Apply(meeting, request);
        ReplaceTargetRoles(meeting, request.TargetRoleKeys);

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.Meetings.Add(meeting);
        await _db.SaveChangesAsync();
        await SyncCalendarAsync(meeting, user);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return ToDto(await RequireAsync(meeting.Id));
    }

    public async Task<MeetingDto> UpdateAsync(User user, long id, MeetingRequest request)
    {
        var meeting = await RequireAsync(id);
        Apply(meeting, request);
        ReplaceTargetRoles(meeting, request.TargetRoleKeys);

        await using var tx = await _db.Database.BeginTransactionAsync();
        await SyncCalendarAsync(meeting, user);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return ToDto(await RequireAsync(id));
    }

    public async Task DeleteAsync(long id)
    {
        var meeting = await RequireAsync(id);
        if (meeting.CalendarEvent != null)
        {
            _db.CalendarEvents.Remove(meeting.CalendarEvent);
        }
        _db.Meetings.Remove(meeting);
        await _db.SaveChangesAsync();
    }

    private static void Apply(Meeting meeting, MeetingRequest request)
    {
        meeting.Title = request.Title.Trim();
        meeting.MeetingDate = ParseDateTime(request.MeetingDate);
        meeting.Attendees = request.Attendees;
        meeting.Agenda = request.Agenda;
        meeting.Minutes = request.Minutes;
        meeting.FollowUpTasks = request.FollowUpTasks;
        meeting.Location = request.Location;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            meeting.Status = Enum.TryParse<MeetingStatus>(request.Status, true, out var status)
                ? status
                : throw new AppException("حالة الاجتماع غير صحيحة");
        }
    }

    private static void ReplaceTargetRoles(Meeting meeting, List<string>? keys)
    {
        meeting.TargetRoles.Clear();
        foreach (var key in (keys ?? new List<string>()).Where(k => !string.IsNullOrWhiteSpace(k)).Distinct())
        {
            meeting.TargetRoles.Add(new MeetingTargetRole { RoleKey = key, Meeting = meeting });
        }
    }

    /// <summary>Creates or updates the role-targeted calendar event; keeps an existing one when roles are removed.</summary>
    private async Task SyncCalendarAsync(Meeting meeting, User user)
    {
        if (meeting.TargetRoles.Count == 0)
        {
            return;
        }

        var evt = meeting.CalendarEvent
                  ?? (meeting.CalendarEventId != null
                      ? await _db.CalendarEvents.Include(e => e.TargetRoles).FirstOrDefaultAsync(e => e.Id == meeting.CalendarEventId)
                      : null);
        if (evt == null)
        {
            evt = new CalendarEvent { EventType = CalendarEventType.PUBLIC, CreatedByUserId = user.Id };
            _db.CalendarEvents.Add(evt);
            meeting.CalendarEvent = evt;
        }

        evt.Title = $"اجتماع: {meeting.Title}";
        evt.Description = meeting.Agenda;
        evt.StartDate = DateOnly.FromDateTime(meeting.MeetingDate);
        evt.EndDate = null;
        evt.Color = "#7b1fa2";
        evt.Notes = meeting.Attendees;
        evt.TargetRoles.Clear();
        foreach (var role in meeting.TargetRoles)
        {
            evt.TargetRoles.Add(new CalendarEventTargetRole { RoleKey = role.RoleKey, CalendarEvent = evt });
        }
    }

    private static DateTime ParseDateTime(string value)
    {
        if (DateTime.TryParseExact(value, new[] { DateFormat, "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd" },
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
        {
            return exact;
        }
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return parsed;
        }
        throw new AppException("تاريخ الاجتماع غير صحيح");
    }

    private static MeetingDto ToDto(Meeting m) => new()
    {
        Id = m.Id,
        Title = m.Title,
        MeetingDate = m.MeetingDate.ToString(DateFormat, CultureInfo.InvariantCulture),
        Attendees = m.Attendees,
        Agenda = m.Agenda,
        Minutes = m.Minutes,
        FollowUpTasks = m.FollowUpTasks,
        Location = m.Location,
        Status = m.Status.ToString(),
        TargetRoleKeys = m.TargetRoleKeys.ToList(),
        CalendarEventId = m.CalendarEventId
    };

    private IQueryable<Meeting> Query() => _db.Meetings.Include(m => m.TargetRoles).Include(m => m.CalendarEvent).ThenInclude(e => e!.TargetRoles);

    private async Task<Meeting> RequireAsync(long id) =>
        await Query().FirstOrDefaultAsync(m => m.Id == id) ?? throw new NotFoundException("الاجتماع غير موجود");
}
