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
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<TeacherAttendance> TeacherAttendances => Set<TeacherAttendance>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<ClassSubjectAssignment> ClassSubjectAssignments => Set<ClassSubjectAssignment>();
    public DbSet<TeacherConstraint> TeacherConstraints => Set<TeacherConstraint>();
    public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();
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
            e.Property(x => x.Assignee).HasMaxLength(150);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Priority).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.DueDate);
            e.HasOne(x => x.Meeting).WithMany().HasForeignKey(x => x.MeetingId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.AssignedTo).WithMany().HasForeignKey(x => x.AssignedToId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.NoAction);
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
            e.HasIndex(x => new { x.StudentId, x.AttendanceDate }).IsUnique();
            e.HasIndex(x => x.AttendanceDate);
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.RecordedBy).WithMany().HasForeignKey(x => x.RecordedById).OnDelete(DeleteBehavior.NoAction);
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
