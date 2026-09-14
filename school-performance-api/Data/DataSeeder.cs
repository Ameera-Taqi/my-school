using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Data;

/// <summary>
/// Idempotent startup seeding. Runs the same steps, in the same order, as the original
/// twelve Spring Boot seeders so a fresh database ends up with identical demo data.
/// </summary>
public class DataSeeder
{
    private readonly AppDbContext _db;
    private readonly ILogger<DataSeeder> _logger;

    private record PermissionDef(string Key, string Name, string Module, string Description);

    private static readonly string[] AllUserCalendarPerms = { "calendar.view", "calendar.personal.create", "calendar.personal.manage" };
    private static readonly string[] PublicCalendarPerms = { "calendar.public.create", "calendar.public.manage" };
    private static readonly string[] PublicEventRoles = { "ADMIN", "SCHOOL_MANAGER", "ASSISTANT_MANAGER" };
    private static readonly string[] TeacherPortalPerms = { "my_classes.view", "my_students.view", "attendance_record.view", "assignments.view", "grades.view", "notes.view" };
    private static readonly string[] SchoolManagerPerms =
    {
        "dashboard.view", "kpi.view", "reports.view", "meetings.view", "meetings.create", "tasks.view", "roles.view",
        "students.view", "teachers.view", "attendance.view", "behavior.view", "internal_requests.view", "alerts.view",
        "class_schedule.view", "class_schedule.manage"
    };
    private static readonly string[] DepartmentHeadPerms = { "teacher_monitoring.view", "lesson_plans.view", "subject_results.view", "academic_notes.view", "resource_bank.view" };
    private static readonly string[] ClassSchedulePerms = { "class_schedule.view", "class_schedule.manage" };
    private static readonly string[] MeetingManagePerms = { "meetings.create", "tasks.create", "roles.view" };

    public DataSeeder(AppDbContext db, ILogger<DataSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        await SeedCoreAsync();                 // 1  DataSeeder
        await SeedAcademicAsync();             // 2  AcademicDataSeeder
        await SeedDepartmentsAsync();          // 3  DepartmentDataSeeder
        await SeedCalendarAsync();             // 4  CalendarDataSeeder
        await SeedTeacherPortalAsync();        // 5  TeacherPortalDataSeeder
        await SeedDemoUsersAsync();            // 6  DemoUsersSeeder
        await SeedSchoolManagerRoleAsync();    // 7  SchoolManagerRoleDataSeeder
        await SeedDepartmentHeadRoleAsync();   // 8  DepartmentHeadRoleDataSeeder
        await SeedClassScheduleAsync();        // 9  ClassScheduleDataSeeder
        await SeedDemoDomainAsync();           // 10 DemoDomainDataSeeder
        await SeedMeetingPermissionsAsync();   // 11 MeetingPermissionsSeeder
        await SeedTeacherUserLinksAsync();     // 12 TeacherUserLinkSeeder
        await SeedDemoMeetingsAndTasksAsync(); // 13 demo meetings/tasks (previously browser-only mock data)
        await SeedOrgStructurePermissionAsync(); // 14 org chart permission for the executive section
        await SeedSchedulingAsync();             // 15 subjects, class assignments, sample teacher constraints
        await SeedTeacherAttendancePermissionAsync(); // 16 scoped teacher-attendance page permission
        await SeedWingSupervisorAsync();               // 17 wing supervisor role + permission
        _logger.LogInformation("Database seeding completed");
    }

    // ---- 1. Core permissions, roles, admin -------------------------------------------------

    private async Task SeedCoreAsync()
    {
        if (await _db.Permissions.AnyAsync())
        {
            return;
        }

        var defs = new List<PermissionDef>
        {
            new("dashboard.view", "عرض لوحة التحكم", "الإدارة العليا", "الوصول إلى لوحة التحكم الرئيسية"),
            new("calendar.view", "عرض التقويم", "لوحة التحكم", "عرض تقويم الأحداث في لوحة التحكم"),
            new("calendar.personal.create", "إضافة حدث شخصي", "لوحة التحكم", "إضافة أحداث شخصية في التقويم"),
            new("calendar.personal.manage", "إدارة الأحداث الشخصية", "لوحة التحكم", "تعديل وحذف الأحداث الشخصية"),
            new("calendar.public.create", "إضافة حدث مدرسي", "لوحة التحكم", "إضافة أحداث مدرسية عامة"),
            new("calendar.public.manage", "إدارة الأحداث المدرسية", "لوحة التحكم", "تعديل وحذف الأحداث المدرسية العامة"),
            new("kpi.view", "عرض مؤشرات الأداء", "الإدارة العليا", "عرض مؤشرات الأداء المدرسي"),
            new("reports.view", "عرض التقارير", "الإدارة العليا", "عرض التقارير الإدارية"),
            new("meetings.view", "متابعة الاجتماعات", "الإدارة العليا", "متابعة وإدارة الاجتماعات"),
            new("meetings.create", "إدارة الاجتماعات", "الإدارة العليا", "إنشاء وتعديل الاجتماعات"),
            new("tasks.view", "متابعة المهام", "الإدارة العليا", "متابعة المهام الإدارية"),
            new("tasks.create", "إدارة المهام", "الإدارة العليا", "إنشاء وتعديل المهام"),

            new("students.view", "عرض الطلاب", "إدارة المدرسة", "عرض قائمة الطلاب"),
            new("students.create", "إضافة طالب", "إدارة المدرسة", "إضافة طلاب جدد"),
            new("students.update", "تعديل طالب", "إدارة المدرسة", "تعديل بيانات الطلاب"),
            new("students.delete", "حذف طالب", "إدارة المدرسة", "حذف الطلاب"),
            new("academicStages.view", "عرض المراحل الدراسية", "إدارة المدرسة", "عرض المراحل الدراسية"),
            new("classes.view", "عرض الفصول", "إدارة المدرسة", "عرض الفصول الدراسية"),
            new("classes.create", "إضافة فصل", "إدارة المدرسة", "إضافة فصول جديدة"),
            new("classes.update", "تعديل فصل", "إدارة المدرسة", "تعديل بيانات الفصول"),
            new("classes.delete", "حذف فصل", "إدارة المدرسة", "حذف الفصول"),
            new("teachers.view", "عرض المعلمين", "إدارة المدرسة", "عرض قائمة المعلمين"),
            new("teachers.manage", "إدارة المعلمين", "إدارة المدرسة", "إضافة وتعديل وحذف المعلمين"),
            new("attendance.view", "عرض الحضور والانصراف", "إدارة المدرسة", "عرض سجلات الحضور"),
            new("attendance.manage", "إدارة الحضور والانصراف", "إدارة المدرسة", "تسجيل وتحديث الحضور"),
            new("behavior.view", "السلوك والانضباط", "إدارة المدرسة", "متابعة السلوك والانضباط"),
            new("behavior.create", "تسجيل ملاحظات سلوكية", "إدارة المدرسة", "إضافة وتعديل الملاحظات السلوكية"),
            new("internal_requests.view", "الطلبات الداخلية", "إدارة المدرسة", "عرض الطلبات الداخلية"),
            new("internal_requests.create", "إنشاء طلب داخلي", "إدارة المدرسة", "تقديم طلبات داخلية جديدة"),
            new("internal_requests.update", "إدارة الطلبات الداخلية", "إدارة المدرسة", "تعديل وحذف الطلبات الداخلية"),
            new("alerts.view", "عرض التنبيهات", "إدارة المدرسة", "عرض التنبيهات"),

            new("teacher_monitoring.view", "متابعة المعلمين", "رؤساء الأقسام", "متابعة أداء المعلمين"),
            new("lesson_plans.view", "خطط الدروس", "رؤساء الأقسام", "عرض خطط الدروس"),
            new("lesson_plans.manage", "إدارة خطط الدروس", "رؤساء الأقسام", "إنشاء وتعديل خطط الدروس"),
            new("class_schedule.view", "جدول الحصص الدراسية", "إدارة المدرسة", "عرض جدول الحصص الأسبوعي"),
            new("class_schedule.manage", "إدارة جدول الحصص", "إدارة المدرسة", "إضافة وتعديل جدول الحصص"),
            new("subject_results.view", "نتائج الطلاب حسب المادة", "رؤساء الأقسام", "عرض نتائج الطلاب"),
            new("academic_notes.view", "الملاحظات الأكاديمية", "رؤساء الأقسام", "عرض الملاحظات الأكاديمية"),
            new("resource_bank.view", "بنك الملفات التعليمية", "رؤساء الأقسام", "الوصول لبنك الملفات"),
            new("resource_bank.manage", "إدارة بنك الملفات", "رؤساء الأقسام", "رفع وإدارة الملفات التعليمية"),

            new("my_classes.view", "فصولي", "المعلمين", "عرض الفصول الدراسية"),
            new("my_students.view", "طلابي", "المعلمين", "عرض طلاب الفصل"),
            new("attendance_record.view", "تسجيل الحضور", "المعلمين", "تسجيل حضور الطلاب"),
            new("assignments.view", "الواجبات", "المعلمين", "إدارة الواجبات"),
            new("grades.view", "الدرجات", "المعلمين", "إدارة الدرجات"),
            new("notes.view", "الملاحظات السلوكية والأكاديمية", "المعلمين", "إضافة الملاحظات"),

            new("users.view", "عرض المستخدمين", "النظام والصلاحيات", "عرض قائمة المستخدمين"),
            new("users.manage", "إدارة المستخدمين", "النظام والصلاحيات", "إضافة وتعديل المستخدمين"),
            new("roles.view", "عرض الأدوار", "النظام والصلاحيات", "عرض الأدوار"),
            new("roles.manage", "إدارة الأدوار", "النظام والصلاحيات", "إضافة وتعديل الأدوار"),
            new("permissions.view", "عرض الصلاحيات", "النظام والصلاحيات", "عرض الصلاحيات"),
            new("permissions.manage", "إدارة الصلاحيات", "النظام والصلاحيات", "إضافة وتعديل الصلاحيات"),
            new("role_permissions.manage", "ربط الصلاحيات بالأدوار", "النظام والصلاحيات", "إدارة صلاحيات الأدوار"),
            new("settings.view", "إعدادات النظام", "النظام والصلاحيات", "الوصول لإعدادات النظام"),
            new("departments.view", "عرض الأقسام", "النظام والصلاحيات", "عرض الأقسام الأكاديمية"),
            new("departments.manage", "إدارة الأقسام", "النظام والصلاحيات", "إدارة الأقسام الأكاديمية")
        };

        var permissions = defs.Select(d => new Permission
        {
            PermissionKey = d.Key, PermissionName = d.Name, ModuleName = d.Module, Description = d.Description, Active = true
        }).ToList();
        _db.Permissions.AddRange(permissions);

        var admin = new Role { RoleKey = "ADMIN", RoleName = "Admin", Description = "مدير النظام", Active = true };
        _db.Roles.AddRange(
            admin,
            new Role { RoleKey = "SCHOOL_MANAGER", RoleName = "مدير المدرسة", Description = "مدير المدرسة", Active = true },
            new Role { RoleKey = "ASSISTANT_MANAGER", RoleName = "مدير مساعد", Description = "مدير مساعد", Active = true },
            new Role { RoleKey = "DEPARTMENT_HEAD", RoleName = "رئيس قسم", Description = "رئيس قسم أكاديمي", Active = true },
            new Role { RoleKey = "TEACHER", RoleName = "معلم", Description = "معلم", Active = true });
        await _db.SaveChangesAsync();

        foreach (var permission in permissions)
        {
            _db.RolePermissions.Add(new RolePermission { RoleId = admin.Id, PermissionId = permission.Id, Granted = true });
        }

        _db.Users.Add(new User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            FullName = "مدير النظام",
            Email = "admin@school.local",
            Active = true,
            Roles = new List<Role> { admin }
        });
        await _db.SaveChangesAsync();
    }

    // ---- 2. Academic stages + late-added permissions ---------------------------------------

    private async Task SeedAcademicAsync()
    {
        if (!await _db.AcademicStages.AnyAsync())
        {
            _db.AcademicStages.AddRange(
                new AcademicStage { Name = "العاشر", Code = "GRADE_10", Description = "المرحلة العاشرة" },
                new AcademicStage { Name = "الحادي عشر", Code = "GRADE_11", Description = "المرحلة الحادية عشر" },
                new AcademicStage { Name = "الثاني عشر", Code = "GRADE_12", Description = "المرحلة الثانية عشر" });
            await _db.SaveChangesAsync();
        }

        var newPerms = new List<PermissionDef>
        {
            new("academicStages.view", "عرض المراحل الدراسية", "إدارة المدرسة", "عرض المراحل الدراسية"),
            new("classes.view", "عرض الفصول", "إدارة المدرسة", "عرض الفصول الدراسية"),
            new("classes.create", "إضافة فصل", "إدارة المدرسة", "إضافة فصول جديدة"),
            new("classes.update", "تعديل فصل", "إدارة المدرسة", "تعديل بيانات الفصول"),
            new("classes.delete", "حذف فصل", "إدارة المدرسة", "حذف الفصول"),
            new("students.create", "إضافة طالب", "إدارة المدرسة", "إضافة طلاب جدد"),
            new("students.update", "تعديل طالب", "إدارة المدرسة", "تعديل بيانات الطلاب"),
            new("students.delete", "حذف طالب", "إدارة المدرسة", "حذف الطلاب"),
            new("attendance.manage", "إدارة الحضور والانصراف", "إدارة المدرسة", "تسجيل وتحديث الحضور"),
            new("behavior.create", "تسجيل ملاحظات سلوكية", "إدارة المدرسة", "إضافة وتعديل الملاحظات السلوكية"),
            new("internal_requests.create", "إنشاء طلب داخلي", "إدارة المدرسة", "تقديم طلبات داخلية جديدة"),
            new("internal_requests.update", "إدارة الطلبات الداخلية", "إدارة المدرسة", "تعديل وحذف الطلبات الداخلية"),
            new("meetings.create", "إدارة الاجتماعات", "الإدارة العليا", "إنشاء وتعديل الاجتماعات"),
            new("tasks.create", "إدارة المهام", "الإدارة العليا", "إنشاء وتعديل المهام"),
            new("lesson_plans.manage", "إدارة خطط الدروس", "رؤساء الأقسام", "إنشاء وتعديل خطط الدروس"),
            new("resource_bank.manage", "إدارة بنك الملفات", "رؤساء الأقسام", "رفع وإدارة الملفات التعليمية")
        };
        var admin = await FindRoleAsync("ADMIN");
        foreach (var def in newPerms)
        {
            if (await _db.Permissions.AnyAsync(p => p.PermissionKey == def.Key))
            {
                continue;
            }
            var permission = new Permission { PermissionKey = def.Key, PermissionName = def.Name, ModuleName = def.Module, Description = def.Description, Active = true };
            _db.Permissions.Add(permission);
            await _db.SaveChangesAsync();
            if (admin != null)
            {
                await GrantIfMissingAsync(admin, permission);
            }
        }
    }

    // ---- 3. Departments ---------------------------------------------------------------------

    private async Task SeedDepartmentsAsync()
    {
        if (await _db.Departments.AnyAsync())
        {
            return;
        }
        _db.Departments.AddRange(
            new Department { Code = "MATH", Name = "قسم الرياضيات", Description = "قسم الرياضيات والعلوم الحسابية", Active = true },
            new Department { Code = "SCIENCE", Name = "قسم العلوم", Description = "قسم العلوم الطبيعية", Active = true },
            new Department { Code = "ARABIC", Name = "قسم اللغة العربية", Description = "قسم اللغة العربية وآدابها", Active = true },
            new Department { Code = "ENGLISH", Name = "قسم اللغة الإنجليزية", Description = "قسم اللغة الإنجليزية", Active = true },
            new Department { Code = "BIO", Name = "قسم الأحياء", Description = "قسم الأحياء", Active = true },
            new Department { Code = "GEO", Name = "قسم الجيولوجيا", Description = "قسم الجيولوجيا", Active = true },
            new Department { Code = "PHY", Name = "قسم الفيزياء", Description = "قسم الفيزياء", Active = true },
            new Department { Code = "CHEM", Name = "قسم الكيمياء", Description = "قسم الكيمياء", Active = true },
            new Department { Code = "PHIL", Name = "قسم الفلسفة", Description = "قسم الفلسفة", Active = true },
            new Department { Code = "SOC", Name = "قسم الاجتماعيات", Description = "قسم الاجتماعيات", Active = true });
        await _db.SaveChangesAsync();
    }

    // ---- 4. Calendar permissions + sample events --------------------------------------------

    private async Task SeedCalendarAsync()
    {
        var defs = new List<PermissionDef>
        {
            new("calendar.view", "عرض التقويم", "لوحة التحكم", "عرض تقويم الأحداث في لوحة التحكم"),
            new("calendar.personal.create", "إضافة حدث شخصي", "لوحة التحكم", "إضافة أحداث شخصية في التقويم"),
            new("calendar.personal.manage", "إدارة الأحداث الشخصية", "لوحة التحكم", "تعديل وحذف الأحداث الشخصية"),
            new("calendar.public.create", "إضافة حدث مدرسي", "لوحة التحكم", "إضافة أحداث مدرسية عامة"),
            new("calendar.public.manage", "إدارة الأحداث المدرسية", "لوحة التحكم", "تعديل وحذف الأحداث المدرسية العامة")
        };
        var permissions = new Dictionary<string, Permission>();
        foreach (var def in defs)
        {
            permissions[def.Key] = await EnsurePermissionAsync(def);
        }

        var roles = await _db.Roles.ToListAsync();
        foreach (var role in roles)
        {
            foreach (var key in AllUserCalendarPerms)
            {
                await GrantIfMissingAsync(role, permissions[key]);
            }
        }
        foreach (var role in roles.Where(r => PublicEventRoles.Contains(r.RoleKey)))
        {
            foreach (var key in PublicCalendarPerms)
            {
                await GrantIfMissingAsync(role, permissions[key]);
            }
        }

        if (await _db.CalendarEvents.AnyAsync())
        {
            return;
        }
        var admin = await _db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        if (admin == null)
        {
            return;
        }
        _db.CalendarEvents.AddRange(
            SampleEvent(admin, "بداية الفصل الدراسي", "بداية الفصل الدراسي الثاني", new DateOnly(2026, 6, 1), null, "#1976d2"),
            SampleEvent(admin, "اجتماع أولياء الأمور", "اجتماع عام مع أولياء الأمور", new DateOnly(2026, 6, 15), new DateOnly(2026, 6, 15), "#7b1fa2"),
            SampleEvent(admin, "اختبار قصير", "اختبار قصير للمرحلة العاشرة", new DateOnly(2026, 6, 22), null, "#f57c00"),
            SampleEvent(admin, "إجازة رسمية", "إجازة رسمية للمدرسة", new DateOnly(2026, 6, 28), new DateOnly(2026, 6, 29), "#c62828"));
        await _db.SaveChangesAsync();
    }

    private static CalendarEvent SampleEvent(User creator, string title, string description, DateOnly start, DateOnly? end, string color) => new()
    {
        Title = title,
        Description = description,
        StartDate = start,
        EndDate = end,
        EventType = CalendarEventType.PUBLIC,
        Color = color,
        Notes = "حدث تجريبي",
        CreatedByUserId = creator.Id,
        CreatedBy = creator
    };

    // ---- 5. Teacher portal permissions for TEACHER -------------------------------------------

    private async Task SeedTeacherPortalAsync()
    {
        var teacherRole = await FindRoleAsync("TEACHER");
        if (teacherRole == null)
        {
            return;
        }
        await GrantKeysIfMissingAsync(teacherRole, TeacherPortalPerms);
    }

    // ---- 6. Demo users ----------------------------------------------------------------------

    private async Task SeedDemoUsersAsync()
    {
        await EnsureUserAsync("mariam", "mariam123", "مريم الزهراني", "mariam@school.om", "TEACHER");
        await EnsureUserAsync("manager", "manager123", "محمد السعيدي", "manager@school.om", "SCHOOL_MANAGER");
        await EnsureUserAsync("salem", "salem123", "سالم الحارثي", "salem@school.om", "DEPARTMENT_HEAD");
    }

    private async Task EnsureUserAsync(string username, string password, string fullName, string email, string roleKey)
    {
        if (await _db.Users.AnyAsync(u => u.Username == username))
        {
            return;
        }
        var role = await FindRoleAsync(roleKey) ?? throw new InvalidOperationException($"Role {roleKey} is missing");
        _db.Users.Add(new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            FullName = fullName,
            Email = email,
            Active = true,
            Roles = new List<Role> { role }
        });
        await _db.SaveChangesAsync();
    }

    // ---- 7. School manager role ---------------------------------------------------------------

    private async Task SeedSchoolManagerRoleAsync()
    {
        var role = await FindRoleAsync("SCHOOL_MANAGER");
        if (role != null)
        {
            await GrantKeysIfMissingAsync(role, SchoolManagerPerms);
        }
    }

    // ---- 8. Department head roles ----------------------------------------------------------------

    private async Task SeedDepartmentHeadRoleAsync()
    {
        var headRoles = await _db.Roles.Where(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD")).ToListAsync();
        foreach (var role in headRoles)
        {
            await GrantKeysIfMissingAsync(role, DepartmentHeadPerms);
            await GrantKeysIfMissingAsync(role, AllUserCalendarPerms);
            await RevokeKeysAsync(role, TeacherPortalPerms);
        }
    }

    // ---- 9. Class schedule permissions ---------------------------------------------------------

    private async Task SeedClassScheduleAsync()
    {
        var defs = new List<PermissionDef>
        {
            new("class_schedule.view", "جدول الحصص الدراسية", "إدارة المدرسة", "عرض جدول الحصص الأسبوعي"),
            new("class_schedule.manage", "إدارة جدول الحصص", "إدارة المدرسة", "إضافة وتعديل جدول الحصص")
        };
        var admin = await FindRoleAsync("ADMIN");
        foreach (var def in defs)
        {
            var permission = await EnsurePermissionAsync(def);
            if (permission.ModuleName != def.Module)
            {
                permission.ModuleName = def.Module;
                await _db.SaveChangesAsync();
            }
            if (admin != null)
            {
                await GrantIfMissingAsync(admin, permission);
            }
        }

        var schoolManager = await FindRoleAsync("SCHOOL_MANAGER");
        if (schoolManager != null)
        {
            await GrantKeysIfMissingAsync(schoolManager, ClassSchedulePerms);
        }
        var departmentHead = await FindRoleAsync("DEPARTMENT_HEAD");
        if (departmentHead != null)
        {
            await RevokeKeysAsync(departmentHead, ClassSchedulePerms);
        }
    }

    // ---- 10. Demo classes, teachers, students --------------------------------------------------

    private async Task SeedDemoDomainAsync()
    {
        if (await _db.SchoolClasses.AnyAsync())
        {
            return;
        }
        var stages = await _db.AcademicStages.ToDictionaryAsync(s => s.Code);
        var departments = await _db.Departments.ToDictionaryAsync(d => d.Code);
        if (!stages.TryGetValue("GRADE_10", out var grade10)
            || !stages.TryGetValue("GRADE_11", out var grade11)
            || !stages.TryGetValue("GRADE_12", out var grade12))
        {
            return;
        }

        var class10a = NewClass("10-أ", 30, grade10);
        var class10b = NewClass("10-ب", 28, grade10);
        var class11a = NewClass("11-أ", 26, grade11);
        var class12a = NewClass("12-أ", 24, grade12);
        _db.SchoolClasses.AddRange(class10a, class10b, class11a, class12a);
        await _db.SaveChangesAsync();

        if (!await _db.Teachers.AnyAsync())
        {
            var teacherDefs = new (string Emp, string Name, string Email, string Phone, string Spec, string Dept, string? Username)[]
            {
                ("T-1001", "أ. سالم الحارثي", "salem@school.om", "96891110001", "رياضيات", "MATH", "salem"),
                ("T-1002", "أ. مريم الزهراني", "mariam@school.om", "96891110002", "رياضيات", "MATH", "mariam"),
                ("T-1003", "أ. فاطمة العمانية", "fatima@school.om", "96891110003", "لغة عربية", "ARABIC", null),
                ("T-1004", "أ. خالد البلوشي", "khalid@school.om", "96891110004", "لغة إنجليزية", "ENGLISH", null),
                ("T-1005", "أ. نورة السعيدي", "noura@school.om", "96891110005", "علوم", "SCIENCE", null),
                ("T-1006", "أ. محمد السعيدي", "manager@school.om", "96891110006", "إحصاء", "MATH", "manager")
            };
            foreach (var def in teacherDefs)
            {
                var user = def.Username == null ? null : await _db.Users.FirstOrDefaultAsync(u => u.Username == def.Username);
                _db.Teachers.Add(new Teacher
                {
                    EmployeeNumber = def.Emp,
                    FullName = def.Name,
                    Email = def.Email,
                    Phone = def.Phone,
                    Specialization = def.Spec,
                    HireDate = new DateOnly(2020, 9, 1),
                    DepartmentId = departments.TryGetValue(def.Dept, out var dept) ? dept.Id : null,
                    UserId = user?.Id,
                    Active = true
                });
            }
            await _db.SaveChangesAsync();
        }

        var studentDefs = new (string CivilId, string Name, Gender Gender, string Phone, SchoolClass Class)[]
        {
            ("1001001", "أحمد محمد السعيدي", Gender.MALE, "96890001111", class10a),
            ("1001002", "فاطمة علي الحارثي", Gender.FEMALE, "96890002222", class10a),
            ("1001003", "خالد سعيد البلوشي", Gender.MALE, "96890003333", class10b),
            ("1001004", "نورة حسن الزهراني", Gender.FEMALE, "96890004444", class10b),
            ("1001005", "محمد عبدالله", Gender.MALE, "96890005555", class10a),
            ("1001006", "مريم سالم", Gender.FEMALE, "96890006666", class10a),
            ("1101001", "عمر يوسف", Gender.MALE, "96890007777", class11a),
            ("1101002", "لمى السبيعي", Gender.FEMALE, "96890008888", class11a),
            ("1101003", "سعيد الحارثي", Gender.MALE, "96890009999", class11a),
            ("1201001", "ريم العتيبي", Gender.FEMALE, "96890010001", class12a),
            ("1201002", "ياسر الشكيلي", Gender.MALE, "96890010002", class12a)
        };
        foreach (var def in studentDefs)
        {
            _db.Students.Add(new Student
            {
                CivilId = def.CivilId,
                FullName = def.Name,
                BirthDate = new DateOnly(2008, 5, 10),
                Gender = def.Gender,
                GuardianPhone = def.Phone,
                Status = StudentStatus.ACTIVE,
                SchoolClassId = def.Class.Id,
                SchoolClass = def.Class
            });
        }
        await _db.SaveChangesAsync();
    }

    private static SchoolClass NewClass(string name, int capacity, AcademicStage stage) => new()
    {
        Name = name, Capacity = capacity, Notes = "فصل تجريبي", AcademicStageId = stage.Id, AcademicStage = stage
    };

    // ---- 11. Meeting management permissions -----------------------------------------------------

    private async Task SeedMeetingPermissionsAsync()
    {
        foreach (var roleKey in new[] { "ADMIN", "SCHOOL_MANAGER" })
        {
            var role = await FindRoleAsync(roleKey);
            if (role != null)
            {
                await GrantKeysIfMissingAsync(role, MeetingManagePerms);
            }
        }
    }

    // ---- 12. Link demo teachers to demo users ------------------------------------------------------

    private async Task SeedTeacherUserLinksAsync()
    {
        var links = new Dictionary<string, string> { ["T-1001"] = "salem", ["T-1002"] = "mariam", ["T-1006"] = "manager" };
        foreach (var (employeeNumber, username) in links)
        {
            var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.EmployeeNumber == employeeNumber && t.UserId == null);
            if (teacher == null)
            {
                continue;
            }
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user != null)
            {
                teacher.UserId = user.Id;
            }
        }
        await _db.SaveChangesAsync();
    }

    // ---- 13. Demo meetings and tasks ----------------------------------------------------------------

    private async Task SeedDemoMeetingsAndTasksAsync()
    {
        if (await _db.Meetings.AnyAsync() || await _db.Tasks.AnyAsync())
        {
            return;
        }
        var admin = await _db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        var board = new Meeting
        {
            Title = "اجتماع مجلس الإدارة", MeetingDate = new DateTime(2026, 6, 18, 10, 0, 0), Attendees = "المدير، نواب المدير",
            Agenda = "متابعة الخطة السنوية", Minutes = "تمت الموافقة على الخطة", FollowUpTasks = "إعداد تقرير الحضور",
            OrganizerId = admin?.Id, Status = MeetingStatus.COMPLETED
        };
        board.TargetRoles.Add(new MeetingTargetRole { RoleKey = "ADMIN", Meeting = board });
        board.TargetRoles.Add(new MeetingTargetRole { RoleKey = "SCHOOL_MANAGER", Meeting = board });
        var heads = new Meeting
        {
            Title = "اجتماع رؤساء الأقسام", MeetingDate = new DateTime(2026, 6, 15, 9, 0, 0), Attendees = "رؤساء الأقسام",
            Agenda = "مراجعة خطط الدروس", Minutes = "—", FollowUpTasks = "تحديث الخطط", OrganizerId = admin?.Id, Status = MeetingStatus.COMPLETED
        };
        heads.TargetRoles.Add(new MeetingTargetRole { RoleKey = "DEPARTMENT_HEAD", Meeting = heads });
        _db.Meetings.AddRange(board, heads);
        await _db.SaveChangesAsync();

        _db.Tasks.AddRange(
            new TaskItem { Title = "إعداد تقرير الحضور الشهري", Description = "تجميع بيانات الحضور لشهر يونيو", Assignee = "المدير المساعد", DueDate = new DateOnly(2026, 6, 25), Priority = TaskPriority.HIGH, Status = Entities.TaskStatus.IN_PROGRESS, MeetingId = board.Id, CreatedById = admin?.Id },
            new TaskItem { Title = "مراجعة خطط الدروس", Description = "مراجعة خطط الأسبوع القادم", Assignee = "رئيس قسم الرياضيات", DueDate = new DateOnly(2026, 6, 22), Priority = TaskPriority.MEDIUM, Status = Entities.TaskStatus.NEW, CreatedById = admin?.Id },
            new TaskItem { Title = "متابعة طلبات الصيانة", Description = "متابعة الطلبات المفتوحة", Assignee = "مسؤول الصيانة", DueDate = new DateOnly(2026, 6, 20), Priority = TaskPriority.HIGH, Status = Entities.TaskStatus.OVERDUE, CreatedById = admin?.Id });
        await _db.SaveChangesAsync();
    }

    // ---- 14. Org structure permission ------------------------------------------------------------------

    private async Task SeedOrgStructurePermissionAsync()
    {
        var permission = await EnsurePermissionAsync(new PermissionDef("org_structure.view", "الهيكل التنظيمي", "الإدارة العليا", "عرض الهيكل التنظيمي للمدرسة"));
        foreach (var roleKey in new[] { "ADMIN", "SCHOOL_MANAGER", "ASSISTANT_MANAGER" })
        {
            var role = await FindRoleAsync(roleKey);
            if (role != null)
            {
                await GrantIfMissingAsync(role, permission);
            }
        }
    }

    // ---- 15. Scheduling demo data --------------------------------------------------------------------

    private async Task SeedSchedulingAsync()
    {
        if (await _db.Subjects.AnyAsync())
        {
            return;
        }
        var subjects = new Dictionary<string, Subject>
        {
            ["MATH"] = new() { Name = "رياضيات", Code = "MATH", Color = "#1976d2" },
            ["SCI"] = new() { Name = "علوم", Code = "SCI", Color = "#2e7d32" },
            ["AR"] = new() { Name = "لغة عربية", Code = "AR", Color = "#6a1b9a" },
            ["EN"] = new() { Name = "لغة إنجليزية", Code = "EN", Color = "#ef6c00" },
            ["STAT"] = new() { Name = "إحصاء", Code = "STAT", Color = "#00838f" }
        };
        _db.Subjects.AddRange(subjects.Values);
        await _db.SaveChangesAsync();

        var teachers = await _db.Teachers.ToDictionaryAsync(t => t.EmployeeNumber);
        var classes = await _db.SchoolClasses.ToListAsync();
        Teacher? T(string emp) => teachers.TryGetValue(emp, out var t) ? t : null;
        var plan = new (string Subject, string Emp, int Periods)[]
        {
            ("MATH", "T-1002", 5), ("SCI", "T-1005", 4), ("AR", "T-1003", 5), ("EN", "T-1004", 4), ("STAT", "T-1006", 2)
        };
        foreach (var c in classes)
        {
            foreach (var (subject, emp, periods) in plan)
            {
                var teacher = T(emp);
                if (teacher == null) continue;
                _db.ClassSubjectAssignments.Add(new ClassSubjectAssignment { SchoolClassId = c.Id, SubjectId = subjects[subject].Id, TeacherId = teacher.Id, PeriodsPerWeek = periods });
            }
        }

        if (T("T-1002") is { } mariam) _db.TeacherConstraints.Add(new TeacherConstraint { TeacherId = mariam.Id, Type = TeacherConstraintType.UNAVAILABLE_DAY, Day = 4, Note = "دوام جزئي" });
        if (T("T-1004") is { } khalid) _db.TeacherConstraints.Add(new TeacherConstraint { TeacherId = khalid.Id, Type = TeacherConstraintType.NO_FIRST_PERIOD });
        if (T("T-1003") is { } fatima) _db.TeacherConstraints.Add(new TeacherConstraint { TeacherId = fatima.Id, Type = TeacherConstraintType.NO_LAST_PERIOD });
        if (T("T-1005") is { } noura) _db.TeacherConstraints.Add(new TeacherConstraint { TeacherId = noura.Id, Type = TeacherConstraintType.MAX_PERIODS_PER_DAY, Value = 4 });
        if (T("T-1006") is { } manager) _db.TeacherConstraints.Add(new TeacherConstraint { TeacherId = manager.Id, Type = TeacherConstraintType.UNAVAILABLE_PERIOD, Period = 7, Note = "اجتماعات الإدارة" });
        await _db.SaveChangesAsync();
    }

    // ---- 16. Teacher attendance page permission --------------------------------------------------------

    private async Task SeedTeacherAttendancePermissionAsync()
    {
        var permission = await EnsurePermissionAsync(new PermissionDef("teacher_attendance.view", "حضور المعلمين", "إدارة المدرسة", "عرض حضور وانصراف المعلمين حسب النطاق (الإدارة: الجميع، رئيس القسم: قسمه، المعلم: نفسه)"));
        foreach (var roleKey in new[] { "ADMIN", "SCHOOL_MANAGER", "ASSISTANT_MANAGER", "DEPARTMENT_HEAD", "TEACHER" })
        {
            var role = await FindRoleAsync(roleKey);
            if (role != null) await GrantIfMissingAsync(role, permission);
        }
        // Existing department-head roles created with a department suffix.
        foreach (var role in await _db.Roles.Where(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD_")).ToListAsync())
        {
            await GrantIfMissingAsync(role, permission);
        }
    }

    // ---- 17. Wing supervisor ---------------------------------------------------------------------------

    private async Task SeedWingSupervisorAsync()
    {
        var permission = await EnsurePermissionAsync(new PermissionDef("wing_supervisor.view", "حضور الطلاب (مشرف الجناح)", "مشرف الجناح", "تسجيل ومتابعة حضور الطلاب بصفة مشرف جناح"));
        var role = await FindRoleAsync("WING_SUPERVISOR");
        if (role == null)
        {
            role = new Role { RoleKey = "WING_SUPERVISOR", RoleName = "مشرف جناح", Description = "معلم مكلّف بالإشراف على جناح وتسجيل حضور طلابه (يُضاف إلى دور المعلم)", Active = true };
            _db.Roles.Add(role);
            await _db.SaveChangesAsync();
        }
        await GrantIfMissingAsync(role, permission);
        foreach (var key in new[] { "calendar.view", "calendar.personal.create", "calendar.personal.manage" })
        {
            var calendarPermission = await _db.Permissions.FirstOrDefaultAsync(x => x.PermissionKey == key);
            if (calendarPermission != null) await GrantIfMissingAsync(role, calendarPermission);
        }
        var admin = await FindRoleAsync("ADMIN");
        if (admin != null) await GrantIfMissingAsync(admin, permission);
    }

    // ---- helpers ------------------------------------------------------------------------------------

    private Task<Role?> FindRoleAsync(string roleKey) => _db.Roles.FirstOrDefaultAsync(r => r.RoleKey == roleKey);

    private async Task<Permission> EnsurePermissionAsync(PermissionDef def)
    {
        var existing = await _db.Permissions.FirstOrDefaultAsync(p => p.PermissionKey == def.Key);
        if (existing != null)
        {
            return existing;
        }
        var permission = new Permission { PermissionKey = def.Key, PermissionName = def.Name, ModuleName = def.Module, Description = def.Description, Active = true };
        _db.Permissions.Add(permission);
        await _db.SaveChangesAsync();
        return permission;
    }

    private async Task GrantKeysIfMissingAsync(Role role, IEnumerable<string> permissionKeys)
    {
        foreach (var key in permissionKeys)
        {
            var permission = await _db.Permissions.FirstOrDefaultAsync(p => p.PermissionKey == key);
            if (permission != null)
            {
                await GrantIfMissingAsync(role, permission);
            }
        }
    }

    private async Task GrantIfMissingAsync(Role role, Permission permission)
    {
        if (await _db.RolePermissions.AnyAsync(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id))
        {
            return;
        }
        _db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id, Granted = true });
        await _db.SaveChangesAsync();
    }

    private async Task RevokeKeysAsync(Role role, IEnumerable<string> permissionKeys)
    {
        foreach (var key in permissionKeys)
        {
            var rows = await _db.RolePermissions
                .Where(rp => rp.RoleId == role.Id && rp.Permission.PermissionKey == key)
                .ToListAsync();
            if (rows.Count > 0)
            {
                _db.RolePermissions.RemoveRange(rows);
                await _db.SaveChangesAsync();
            }
        }
    }
}
