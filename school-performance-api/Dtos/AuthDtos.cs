using System.ComponentModel.DataAnnotations;

namespace SchoolPerformance.Api.Dtos;

public class LoginRequest
{
    [Required(ErrorMessage = "اسم المستخدم مطلوب")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string? Token { get; set; }
    public long UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public HashSet<string> Roles { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
    public HashSet<string> Permissions { get; set; } = new();
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? DepartmentCode { get; set; }
    public List<string>? DepartmentSubjects { get; set; }
}

public class DepartmentHeadScopeDto
{
    public long DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string DepartmentCode { get; set; } = string.Empty;
    public List<string> Subjects { get; set; } = new();
}
