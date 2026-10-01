using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<AcademicStage> AcademicStages => Set<AcademicStage>();
    public DbSet<SchoolClass> SchoolClasses => Set<SchoolClass>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<CalendarEventTargetRole> CalendarEventTargetRoles => Set<CalendarEventTargetRole>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<MeetingTargetRole> MeetingTargetRoles => Set<MeetingTargetRole>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskAssignee> TaskAssignees => Set<TaskAssignee>();
    public DbSet<TaskActivity> TaskActivities => Set<TaskActivity>();
    public DbSet<TaskNotice> TaskNotices => Set<TaskNotice>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<AttendanceReminder> AttendanceReminders => Set<AttendanceReminder>();
    public DbSet<TeacherAttendance> TeacherAttendances => Set<TeacherAttendance>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<ClassSubjectAssignment> ClassSubjectAssignments => Set<ClassSubjectAssignment>();
    public DbSet<TeacherConstraint> TeacherConstraints => Set<TeacherConstraint>();
    public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();
    public DbSet<ClassSwapRequest> ClassSwapRequests => Set<ClassSwapRequest>();
    public DbSet<ClassSwapApproval> ClassSwapApprovals => Set<ClassSwapApproval>();
    public DbSet<ClassSwapHistory> ClassSwapHistory => Set<ClassSwapHistory>();
    public DbSet<ScheduleOverride> ScheduleOverrides => Set<ScheduleOverride>();
    public DbSet<ClassSwapNotice> ClassSwapNotices => Set<ClassSwapNotice>();
    public DbSet<RecordCategory> RecordCategories => Set<RecordCategory>();
    public DbSet<StaffRecord> StaffRecords => Set<StaffRecord>();
    public DbSet<RecordFile> RecordFiles => Set<RecordFile>();
    public DbSet<RecordEvent> RecordEvents => Set<RecordEvent>();
    public DbSet<RecordNotice> RecordNotices => Set<RecordNotice>();
    public DbSet<InternalRequest> InternalRequests => Set<InternalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.Property(x => x.Username).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Email).HasMaxLength(150);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.HasMany(x => x.Roles)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "UserRoles",
                    j => j.HasOne<Role>().WithMany().HasForeignKey("RoleId").OnDelete(DeleteBehavior.Cascade),
                    j => j.HasOne<User>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
                    j =>
                    {
                        j.ToTable("UserRoles");
                        j.HasKey("UserId", "RoleId");
                    });
        });

        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("Roles");
            e.Property(x => x.RoleKey).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.RoleKey).IsUnique();
            e.Property(x => x.RoleName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<Permission>(e =>
        {
            e.ToTable("Permissions");
            e.Property(x => x.PermissionKey).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.PermissionKey).IsUnique();
            e.Property(x => x.PermissionName).HasMaxLength(150).IsRequired();
            e.Property(x => x.ModuleName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.ToTable("RolePermissions");
            e.HasIndex(x => new { x.RoleId, x.PermissionId }).IsUnique();
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Department>(e =>
        {
            e.ToTable("Departments");
            e.Property(x => x.Code).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<Teacher>(e =>
        {
            e.ToTable("Teachers");
            e.Property(x => x.EmployeeNumber).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.EmployeeNumber).IsUnique();
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Email).HasMaxLength(150);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Specialization).HasMaxLength(100);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.User).WithOne().HasForeignKey<Teacher>(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AcademicStage>(e =>
        {
            e.ToTable("AcademicStages");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Code).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<SchoolClass>(e =>
        {
            e.ToTable("SchoolClasses");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(500);
            e.HasOne(x => x.AcademicStage).WithMany().HasForeignKey(x => x.AcademicStageId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Student>(e =>
        {
            e.ToTable("Students");
            e.Property(x => x.CivilId).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.CivilId).IsUnique();
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Gender).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.GuardianPhone).HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.Property(x => x.PhotoUrl).HasColumnType("nvarchar(max)");
            e.HasOne(x => x.SchoolClass).WithMany().HasForeignKey(x => x.SchoolClassId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CalendarEvent>(e =>
        {
            e.ToTable("CalendarEvents");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.EventType).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Color).HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.TargetRoles).WithOne(t => t.CalendarEvent).HasForeignKey(t => t.CalendarEventId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.TargetRoleKeys);
        });

        modelBuilder.Entity<CalendarEventTargetRole>(e =>
        {
            e.ToTable("CalendarEventTargetRoles");
            e.HasKey(x => new { x.CalendarEventId, x.RoleKey });
            e.Property(x => x.RoleKey).HasMaxLength(50);
        });

        modelBuilder.Entity<Meeting>(e =>
        {
            e.ToTable("Meetings");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Attendees).HasMaxLength(500);
            e.Property(x => x.Agenda).HasMaxLength(2000);
            e.Property(x => x.Minutes).HasMaxLength(4000);
            e.Property(x => x.FollowUpTasks).HasMaxLength(2000);
            e.Property(x => x.Location).HasMaxLength(200);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.MeetingDate);
            e.HasOne(x => x.Organizer).WithMany().HasForeignKey(x => x.OrganizerId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.CalendarEvent).WithMany().HasForeignKey(x => x.CalendarEventId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.TargetRoles).WithOne(t => t.Meeting).HasForeignKey(t => t.MeetingId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.TargetRoleKeys);
        });

        modelBuilder.Entity<MeetingTargetRole>(e =>
        {
            e.ToTable("MeetingTargetRoles");
            e.HasKey(x => new { x.MeetingId, x.RoleKey });
            e.Property(x => x.RoleKey).HasMaxLength(50);
        });

        modelBuilder.Entity<TaskItem>(e =>
        {
            e.ToTable("Tasks");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.Assignee).HasMaxLength(400);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.Property(x => x.CancelReason).HasMaxLength(500);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Priority).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.DueDate);
            e.HasOne(x => x.Meeting).WithMany().HasForeignKey(x => x.MeetingId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.AssignedTo).WithMany().HasForeignKey(x => x.AssignedToId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TaskAssignee>(e =>
        {
            e.ToTable("TaskAssignees");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.CompletionComment).HasMaxLength(500);
            e.HasIndex(x => new { x.TaskId, x.UserId }).IsUnique();
            e.HasOne(x => x.Task).WithMany(t => t.Assignees).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskActivity>(e =>
        {
            e.ToTable("TaskActivities");
            e.Property(x => x.Action).HasMaxLength(40).IsRequired();
            e.Property(x => x.ActionLabel).HasMaxLength(80).IsRequired();
            e.Property(x => x.RoleLabel).HasMaxLength(80).IsRequired();
            e.Property(x => x.Comment).HasMaxLength(500);
            e.Property(x => x.PreviousStatus).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.NewStatus).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.Task).WithMany(t => t.Activities).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskNotice>(e =>
        {
            e.ToTable("TaskNotices");
            e.Property(x => x.Message).HasMaxLength(400).IsRequired();
            e.HasIndex(x => new { x.UserId, x.ReadAt });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Task).WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Report>(e =>
        {
            e.ToTable("Reports");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.ReportType).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.FilePath).HasMaxLength(500);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Attendance>(e =>
        {
            e.ToTable("Attendance");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.HasIndex(x => new { x.StudentId, x.AttendanceDate, x.Period }).IsUnique();
            e.HasIndex(x => x.AttendanceDate);
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.RecordedBy).WithMany().HasForeignKey(x => x.RecordedById).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.WingEditedBy).WithMany().HasForeignKey(x => x.WingEditedById).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<AttendanceReminder>(e =>
        {
            e.ToTable("AttendanceReminders");
            e.Property(x => x.Subject).HasMaxLength(100);
            e.Property(x => x.Message).HasMaxLength(400).IsRequired();
            e.Property(x => x.Source).HasMaxLength(20).IsRequired();
            e.HasIndex(x => new { x.TeacherId, x.SchoolClassId, x.Period, x.AttendanceDate }).IsUnique();
            e.HasIndex(x => x.AttendanceDate);
            e.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SchoolClass).WithMany().HasForeignKey(x => x.SchoolClassId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeacherAttendance>(e =>
        {
            e.ToTable("TeacherAttendance");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Ignore(x => x.PresenceMinutes);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.HasIndex(x => new { x.TeacherId, x.AttendanceDate }).IsUnique();
            e.HasIndex(x => x.AttendanceDate);
            e.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.RecordedBy).WithMany().HasForeignKey(x => x.RecordedById).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<InternalRequest>(e =>
        {
            e.ToTable("InternalRequests");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.RequestType).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.RequestedBy).WithMany().HasForeignKey(x => x.RequestedById).OnDelete(DeleteBehavior.Restrict);
        });

        ConfigureScheduling(modelBuilder);
    }

    private static void ConfigureScheduling(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Subject>(e =>
        {
            e.ToTable("Subjects");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Code).HasMaxLength(30);
            e.Property(x => x.Color).HasMaxLength(20);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ClassSubjectAssignment>(e =>
        {
            e.ToTable("ClassSubjectAssignments");
            e.HasIndex(x => new { x.SchoolClassId, x.SubjectId }).IsUnique();
            e.HasOne(x => x.SchoolClass).WithMany().HasForeignKey(x => x.SchoolClassId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.SubjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TeacherConstraint>(e =>
        {
            e.ToTable("TeacherConstraints");
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Note).HasMaxLength(300);
            e.HasIndex(x => x.TeacherId);
            e.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScheduleEntry>(e =>
        {
            e.ToTable("ScheduleEntries");
            e.Property(x => x.Room).HasMaxLength(50);
            // One lesson per class slot, and a teacher can only be in one classroom per slot.
            e.HasIndex(x => new { x.SchoolClassId, x.Day, x.Period }).IsUnique();
            e.HasIndex(x => new { x.TeacherId, x.Day, x.Period }).IsUnique();
            e.HasOne(x => x.SchoolClass).WithMany().HasForeignKey(x => x.SchoolClassId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.SubjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassSwapRequest>(e =>
        {
            e.ToTable("ClassSwapRequests");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.RequesterSubject).HasMaxLength(100).IsRequired();
            e.Property(x => x.CounterpartySubject).HasMaxLength(100).IsRequired();
            e.Property(x => x.RequesterClassName).HasMaxLength(100).IsRequired();
            e.Property(x => x.CounterpartyClassName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasIndex(x => x.SwapDate);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => new { x.RequesterEntryId, x.SwapDate });
            e.HasIndex(x => new { x.CounterpartyEntryId, x.SwapDate });
            e.HasOne(x => x.RequesterTeacher).WithMany().HasForeignKey(x => x.RequesterTeacherId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CounterpartyTeacher).WithMany().HasForeignKey(x => x.CounterpartyTeacherId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassSwapApproval>(e =>
        {
            e.ToTable("ClassSwapApprovals");
            e.Property(x => x.Stage).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Decision).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Comment).HasMaxLength(500);
            e.HasIndex(x => new { x.RequestId, x.Stage, x.DepartmentId });
            e.HasOne(x => x.Request).WithMany(x => x.Approvals).HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ActedBy).WithMany().HasForeignKey(x => x.ActedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassSwapHistory>(e =>
        {
            e.ToTable("ClassSwapHistory");
            e.Property(x => x.Action).HasMaxLength(40).IsRequired();
            e.Property(x => x.RoleLabel).HasMaxLength(80).IsRequired();
            e.Property(x => x.Comment).HasMaxLength(500);
            e.HasIndex(x => x.RequestId);
            e.HasOne(x => x.Request).WithMany(x => x.History).HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ScheduleOverride>(e =>
        {
            e.ToTable("ScheduleOverrides");
            e.Property(x => x.Cancelled).HasDefaultValue(false);
            e.HasIndex(x => new { x.OverrideDate, x.ScheduleEntryId }).IsUnique();
            e.HasIndex(x => x.SwapRequestId);
            e.HasOne(x => x.ScheduleEntry).WithMany().HasForeignKey(x => x.ScheduleEntryId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SwapRequest).WithMany().HasForeignKey(x => x.SwapRequestId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassSwapNotice>(e =>
        {
            e.ToTable("ClassSwapNotices");
            e.Property(x => x.Message).HasMaxLength(400).IsRequired();
            e.HasIndex(x => new { x.UserId, x.ReadAt });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Request).WithMany().HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecordCategory>(e =>
        {
            e.ToTable("RecordCategories");
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<StaffRecord>(e =>
        {
            e.ToTable("StaffRecords");
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.ApprovalLevel).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.AuthorityLabel).HasMaxLength(80);
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasIndex(x => x.OwnerUserId);
            e.HasIndex(x => x.Status);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RecordFile>(e =>
        {
            e.ToTable("RecordFiles");
            e.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(120).IsRequired();
            e.HasIndex(x => x.RecordId).IsUnique();
            e.HasOne(x => x.Record).WithOne(x => x.File).HasForeignKey<RecordFile>(x => x.RecordId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecordEvent>(e =>
        {
            e.ToTable("RecordEvents");
            e.Property(x => x.Action).HasMaxLength(40).IsRequired();
            e.Property(x => x.ActionLabel).HasMaxLength(80).IsRequired();
            e.Property(x => x.RoleLabel).HasMaxLength(80).IsRequired();
            e.Property(x => x.Comment).HasMaxLength(500);
            e.Property(x => x.PreviousStatus).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.NewStatus).HasConversion<string>().HasMaxLength(32);
            e.HasIndex(x => x.RecordId);
            e.HasOne(x => x.Record).WithMany(x => x.Events).HasForeignKey(x => x.RecordId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RecordNotice>(e =>
        {
            e.ToTable("RecordNotices");
            e.Property(x => x.Message).HasMaxLength(400).IsRequired();
            e.HasIndex(x => new { x.UserId, x.ReadAt });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Record).WithMany().HasForeignKey(x => x.RecordId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
