using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;

namespace SchoolPerformance.Api.Services;

public static class EntityMapper
{
    public static RoleDto ToRoleDto(Role role) => new()
    {
        Id = role.Id,
        RoleKey = role.RoleKey,
        RoleName = role.RoleName,
        Description = role.Description,
        Active = role.Active
    };

    public static PermissionDto ToPermissionDto(Permission permission) => new()
    {
        Id = permission.Id,
        PermissionKey = permission.PermissionKey,
        PermissionName = permission.PermissionName,
        ModuleName = permission.ModuleName,
        Description = permission.Description,
        Active = permission.Active
    };

    public static UserDto ToUserDto(User user, HashSet<string> permissions, Teacher? teacher)
    {
        var department = teacher?.Department;
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Active = user.Active,
            RoleIds = user.Roles.Select(r => r.Id).ToHashSet(),
            RoleNames = user.Roles.Select(r => r.RoleName).ToList(),
            Permissions = permissions,
            DepartmentId = department?.Id,
            DepartmentName = department?.Name
        };
    }

    public static AcademicStageDto ToAcademicStageDto(AcademicStage stage, long classCount, long studentCount) => new()
    {
        Id = stage.Id,
        Name = stage.Name,
        Code = stage.Code,
        Description = stage.Description,
        ClassCount = classCount,
        StudentCount = studentCount
    };

    public static SchoolClassDto ToSchoolClassDto(SchoolClass schoolClass, long studentCount) => new()
    {
        Id = schoolClass.Id,
        Name = schoolClass.Name,
        Capacity = schoolClass.Capacity,
        Notes = schoolClass.Notes,
        AcademicStageId = schoolClass.AcademicStageId,
        AcademicStageName = schoolClass.AcademicStage?.Name,
        StudentCount = studentCount
    };

    public static StudentDto ToStudentDto(Student student)
    {
        var schoolClass = student.SchoolClass;
        var stage = schoolClass?.AcademicStage;
        return new StudentDto
        {
            Id = student.Id,
            CivilId = student.CivilId,
            FullName = student.FullName,
            BirthDate = student.BirthDate,
            Gender = student.Gender.ToString(),
            GuardianPhone = student.GuardianPhone,
            Status = student.Status.ToString(),
            Notes = student.Notes,
            ClassId = schoolClass?.Id,
            ClassName = schoolClass?.Name,
            AcademicStageId = stage?.Id,
            AcademicStageName = stage?.Name
        };
    }

    public static TeacherDto ToTeacherDto(Teacher teacher)
    {
        var user = teacher.User;
        string? roleKey = null;
        string? roleName = null;
        bool? departmentHead = null;
        // Base role first (head/teacher); extra roles such as WING_SUPERVISOR are flags, not the main role.
        var role = user?.Roles.FirstOrDefault(r => r.RoleKey.StartsWith("DEPARTMENT_HEAD"))
                   ?? user?.Roles.FirstOrDefault(r => r.RoleKey == "TEACHER")
                   ?? user?.Roles.FirstOrDefault(r => r.RoleKey != "WING_SUPERVISOR")
                   ?? user?.Roles.FirstOrDefault();
        if (role != null)
        {
            roleKey = role.RoleKey;
            roleName = role.RoleName;
            departmentHead = roleKey.StartsWith("DEPARTMENT_HEAD");
        }
        var wingSupervisor = user?.Roles.Any(r => r.RoleKey == "WING_SUPERVISOR");
        return new TeacherDto
        {
            Id = teacher.Id,
            EmployeeNumber = teacher.EmployeeNumber,
            FullName = teacher.FullName,
            Email = teacher.Email,
            Phone = teacher.Phone,
            Specialization = teacher.Specialization,
            HireDate = teacher.HireDate,
            DepartmentId = teacher.Department?.Id,
            DepartmentName = teacher.Department?.Name,
            Active = teacher.Active,
            DepartmentHead = departmentHead,
            WingSupervisor = wingSupervisor,
            RoleKey = roleKey,
            RoleName = roleName,
            Username = user?.Username
        };
    }

    public static DepartmentDto ToDepartmentDto(Department department, long teacherCount) => new()
    {
        Id = department.Id,
        Code = department.Code,
        Name = department.Name,
        Description = department.Description,
        Active = department.Active,
        TeacherCount = teacherCount
    };

    public static CalendarEventDto ToCalendarEventDto(CalendarEvent evt, long? currentUserId)
    {
        var creator = evt.CreatedBy;
        return new CalendarEventDto
        {
            Id = evt.Id,
            Title = evt.Title,
            Description = evt.Description,
            StartDate = evt.StartDate.ToString("yyyy-MM-dd"),
            EndDate = evt.EndDate?.ToString("yyyy-MM-dd"),
            EventType = evt.EventType.ToString(),
            Color = evt.Color,
            Notes = evt.Notes,
            TargetRoleKeys = evt.TargetRoleKeys.ToHashSet(),
            CreatedByUserId = creator?.Id ?? evt.CreatedByUserId,
            CreatedByName = creator?.FullName,
            OwnedByCurrentUser = currentUserId != null && evt.CreatedByUserId == currentUserId
        };
    }
}
