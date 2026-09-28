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
    /// <summary>Linked teacher profile id, when the account belongs to a teacher.</summary>
    public long? TeacherId { get; set; }
}

public class ProfileDto
{
    public long UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
    public string? DepartmentName { get; set; }
}

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "الاسم مطلوب")]
    [MaxLength(150, ErrorMessage = "الاسم طويل جداً")]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(150, ErrorMessage = "البريد الإلكتروني طويل جداً")]
    public string? Email { get; set; }

    [MaxLength(30, ErrorMessage = "رقم الهاتف طويل جداً")]
    public string? Phone { get; set; }

    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}

public class DepartmentHeadScopeDto
{
    public long DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string DepartmentCode { get; set; } = string.Empty;
    public List<string> Subjects { get; set; } = new();
}
