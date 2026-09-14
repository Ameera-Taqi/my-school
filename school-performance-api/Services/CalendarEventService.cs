using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public class CalendarEventService
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissionService;

    public CalendarEventService(AppDbContext db, PermissionService permissionService)
    {
        _db = db;
        _permissionService = permissionService;
    }

    public async Task<List<CalendarEventDto>> FindEventsForUserAsync(User user, string? month)
    {
        IQueryable<CalendarEvent> publicQuery = EventsWithDetails().Where(e => e.EventType == CalendarEventType.PUBLIC);
        IQueryable<CalendarEvent> personalQuery = EventsWithDetails()
            .Where(e => e.EventType == CalendarEventType.PERSONAL && e.CreatedByUserId == user.Id);

        if (!string.IsNullOrWhiteSpace(month))
        {
            var (monthStart, monthEnd) = ParseMonth(month);
            publicQuery = publicQuery.Where(e => e.StartDate <= monthEnd && (e.EndDate == null || e.EndDate >= monthStart));
            personalQuery = personalQuery.Where(e => e.StartDate <= monthEnd && (e.EndDate == null || e.EndDate >= monthStart));
        }

        var publicEvents = FilterPublicEvents(await publicQuery.OrderBy(e => e.StartDate).ToListAsync(), user);
        var personalEvents = await personalQuery.OrderBy(e => e.StartDate).ToListAsync();

        return publicEvents.Concat(personalEvents)
            .OrderBy(e => e.StartDate)
            .Select(e => EntityMapper.ToCalendarEventDto(e, user.Id))
            .ToList();
    }

    public async Task<CalendarEventDto> CreateAsync(User user, CalendarEventRequest request)
    {
        var eventType = ParseEventType(request.EventType);
        await ValidateCreatePermissionAsync(user, eventType);

        var evt = new CalendarEvent
        {
            Title = request.Title.Trim(),
            Description = request.Description,
            StartDate = ParseDate(request.StartDate, "تاريخ البداية"),
            EndDate = ParseOptionalDate(request.EndDate),
            EventType = eventType,
            Color = request.Color,
            Notes = request.Notes,
            CreatedByUserId = user.Id,
            CreatedBy = user
        };
        ReplaceTargetRoles(evt, request.TargetRoleKeys);
        ValidateDateRange(evt.StartDate, evt.EndDate);

        _db.CalendarEvents.Add(evt);
        await _db.SaveChangesAsync();
        return EntityMapper.ToCalendarEventDto(evt, user.Id);
    }

    public async Task<CalendarEventDto> UpdateAsync(User user, long eventId, CalendarEventRequest request)
    {
        var evt = await RequireAsync(eventId);
        await ValidateManagePermissionAsync(user, evt);

        var eventType = ParseEventType(request.EventType);
        if (eventType == CalendarEventType.PUBLIC
            && !await _permissionService.HasPermissionAsync(user, "calendar.public.create")
            && !await _permissionService.HasPermissionAsync(user, "meetings.create")
            && IsRoleTargeted(evt)
            && evt.CreatedByUserId != user.Id)
        {
            throw new ForbiddenException("ليس لديك صلاحية تعديل حدث عام");
        }

        evt.Title = request.Title.Trim();
        evt.Description = request.Description;
        evt.StartDate = ParseDate(request.StartDate, "تاريخ البداية");
        evt.EndDate = ParseOptionalDate(request.EndDate);
        evt.EventType = eventType;
        evt.Color = request.Color;
        evt.Notes = request.Notes;
        ReplaceTargetRoles(evt, request.TargetRoleKeys);
        ValidateDateRange(evt.StartDate, evt.EndDate);

        await _db.SaveChangesAsync();
        return EntityMapper.ToCalendarEventDto(evt, user.Id);
    }

    public async Task DeleteAsync(User user, long eventId)
    {
        var evt = await RequireAsync(eventId);
        await ValidateManagePermissionAsync(user, evt);
        _db.CalendarEvents.Remove(evt);
        await _db.SaveChangesAsync();
    }

    private async Task ValidateCreatePermissionAsync(User user, CalendarEventType eventType)
    {
        if (eventType != CalendarEventType.PUBLIC)
        {
            return;
        }
        if (!await _permissionService.HasPermissionAsync(user, "calendar.public.create")
            && !await _permissionService.HasPermissionAsync(user, "meetings.create"))
        {
            throw new ForbiddenException("ليس لديك صلاحية إضافة حدث مدرسي عام");
        }
    }

    private async Task ValidateManagePermissionAsync(User user, CalendarEvent evt)
    {
        if (evt.EventType == CalendarEventType.PUBLIC)
        {
            if (IsRoleTargeted(evt))
            {
                if (await _permissionService.HasPermissionAsync(user, "meetings.create")
                    || await _permissionService.HasPermissionAsync(user, "calendar.public.manage")
                    || evt.CreatedByUserId == user.Id)
                {
                    return;
                }
                throw new ForbiddenException("لا يمكنك تعديل أو حذف هذا الحدث");
            }
            if (!await _permissionService.HasPermissionAsync(user, "calendar.public.manage"))
            {
                throw new ForbiddenException("ليس لديك صلاحية إدارة الأحداث المدرسية");
            }
        }
        else if (evt.CreatedByUserId != user.Id)
        {
            throw new ForbiddenException("لا يمكنك تعديل أو حذف حدث شخصي ليس ملكك");
        }
    }

    private static List<CalendarEvent> FilterPublicEvents(List<CalendarEvent> publicEvents, User user)
    {
        var userRoleKeys = user.Roles.Select(r => r.RoleKey).ToHashSet();
        return publicEvents
            .Where(e => !IsRoleTargeted(e) || e.TargetRoleKeys.Any(userRoleKeys.Contains))
            .ToList();
    }

    private static bool IsRoleTargeted(CalendarEvent evt) => evt.TargetRoles.Count > 0;

    private static void ReplaceTargetRoles(CalendarEvent evt, HashSet<string>? targetRoleKeys)
    {
        evt.TargetRoles.Clear();
        foreach (var key in targetRoleKeys ?? new HashSet<string>())
        {
            if (!string.IsNullOrWhiteSpace(key))
            {
                evt.TargetRoles.Add(new CalendarEventTargetRole { RoleKey = key, CalendarEvent = evt });
            }
        }
    }

    private static (DateOnly Start, DateOnly End) ParseMonth(string month)
    {
        if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            throw new AppException("صيغة الشهر غير صحيحة، استخدم YYYY-MM");
        }
        var start = new DateOnly(parsed.Year, parsed.Month, 1);
        return (start, start.AddMonths(1).AddDays(-1));
    }

    private static CalendarEventType ParseEventType(string value) =>
        Enum.TryParse<CalendarEventType>(value, true, out var type) ? type : throw new AppException("نوع الحدث غير صحيح");

    private static DateOnly ParseDate(string value, string fieldName)
    {
        var raw = value.Length >= 10 ? value[..10] : value;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : throw new AppException($"{fieldName} غير صحيح");
    }

    private static DateOnly? ParseOptionalDate(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : ParseDate(value, "تاريخ النهاية");

    private static void ValidateDateRange(DateOnly start, DateOnly? end)
    {
        if (end != null && end < start)
        {
            throw new AppException("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
        }
    }

    private IQueryable<CalendarEvent> EventsWithDetails() =>
        _db.CalendarEvents.Include(e => e.CreatedBy).Include(e => e.TargetRoles);

    private async Task<CalendarEvent> RequireAsync(long id) =>
        await EventsWithDetails().FirstOrDefaultAsync(e => e.Id == id)
        ?? throw new NotFoundException("الحدث غير موجود");
}
