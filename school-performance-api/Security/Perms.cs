namespace SchoolPerformance.Api.Security;

/// <summary>Permission keys as seeded in the Permissions table. Keep in sync with the frontend sidebar config.</summary>
public static class Perms
{
    public const string DashboardView = "dashboard.view";
    public const string CalendarView = "calendar.view";
    public const string CalendarPersonalCreate = "calendar.personal.create";
    public const string CalendarPersonalManage = "calendar.personal.manage";
    public const string CalendarPublicCreate = "calendar.public.create";
    public const string CalendarPublicManage = "calendar.public.manage";
    public const string KpiView = "kpi.view";
    public const string ReportsView = "reports.view";
    public const string MeetingsView = "meetings.view";
    public const string MeetingsCreate = "meetings.create";
    public const string TasksView = "tasks.view";
    public const string TasksCreate = "tasks.create";
    public const string OrgStructureView = "org_structure.view";

    public const string StudentsView = "students.view";
    public const string StudentsCreate = "students.create";
    public const string StudentsUpdate = "students.update";
    public const string StudentsDelete = "students.delete";
    public const string AcademicStagesView = "academicStages.view";
    public const string ClassesView = "classes.view";
    public const string ClassesCreate = "classes.create";
    public const string ClassesUpdate = "classes.update";
    public const string ClassesDelete = "classes.delete";
    public const string TeachersView = "teachers.view";
    public const string TeachersManage = "teachers.manage";
    public const string AttendanceView = "attendance.view";
    public const string AttendanceManage = "attendance.manage";
    /// <summary>Scoped view of teacher attendance: management sees all, heads their department, teachers themselves.</summary>
    public const string TeacherAttendanceView = "teacher_attendance.view";
    /// <summary>Wing supervisor: record student attendance for the classes in their wing.</summary>
    public const string WingSupervisorView = "wing_supervisor.view";
    public const string BehaviorView = "behavior.view";
    public const string BehaviorCreate = "behavior.create";
    public const string InternalRequestsView = "internal_requests.view";
    public const string AlertsView = "alerts.view";
    public const string ClassScheduleView = "class_schedule.view";
    public const string ClassScheduleManage = "class_schedule.manage";

    public const string TeacherMonitoringView = "teacher_monitoring.view";
    public const string LessonPlansView = "lesson_plans.view";
    public const string SubjectResultsView = "subject_results.view";
    public const string AcademicNotesView = "academic_notes.view";
    public const string ResourceBankView = "resource_bank.view";

    public const string MyClassesView = "my_classes.view";
    public const string MyStudentsView = "my_students.view";
    public const string AttendanceRecordView = "attendance_record.view";
    public const string AssignmentsView = "assignments.view";
    public const string GradesView = "grades.view";
    public const string NotesView = "notes.view";

    public const string UsersView = "users.view";
    public const string UsersManage = "users.manage";
    public const string RolesView = "roles.view";
    public const string RolesManage = "roles.manage";
    public const string PermissionsView = "permissions.view";
    public const string PermissionsManage = "permissions.manage";
    public const string RolePermissionsManage = "role_permissions.manage";
    public const string SettingsView = "settings.view";
    public const string DepartmentsView = "departments.view";
    public const string DepartmentsManage = "departments.manage";

    // Attribute arguments must be compile-time constants, so the groups below are comma-separated
    // strings; RequirePermissionAttribute splits them.

    /// <summary>Anyone whose screens need stages, classes or students as lookups.</summary>
    public const string AcademicRead = StudentsView + "," + StudentsCreate + "," + StudentsUpdate + "," + StudentsDelete + "," + AcademicStagesView + "," + ClassesView + "," + ClassesCreate + "," + ClassesUpdate + "," + ClassesDelete + ","
        + AttendanceView + "," + AttendanceManage + "," + AttendanceRecordView + "," + WingSupervisorView + "," + MyClassesView + "," + MyStudentsView + "," + GradesView + "," + AssignmentsView + "," + NotesView + ","
        + BehaviorView + "," + BehaviorCreate + "," + ClassScheduleView + "," + ClassScheduleManage + "," + SubjectResultsView + "," + AcademicNotesView + "," + KpiView + "," + ReportsView + "," + DashboardView;

    /// <summary>Anyone whose screens need departments or teachers as lookups.</summary>
    public const string StaffRead = TeachersView + "," + TeachersManage + "," + DepartmentsView + "," + DepartmentsManage + "," + UsersView + "," + UsersManage + "," + TeacherMonitoringView + ","
        + AttendanceView + "," + AttendanceManage + "," + KpiView + "," + ReportsView + "," + ClassScheduleView + "," + ClassScheduleManage + "," + LessonPlansView + ","
        + AcademicNotesView + "," + SubjectResultsView + "," + DashboardView;

    public const string RolesRead = RolesView + "," + RolesManage + "," + UsersView + "," + UsersManage + "," + RolePermissionsManage + "," + MeetingsView + "," + MeetingsCreate + "," + CalendarPublicCreate + "," + CalendarPublicManage;

    public const string PermissionsRead = PermissionsView + "," + PermissionsManage + "," + RolePermissionsManage;


}
