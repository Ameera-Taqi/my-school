namespace SchoolPerformance.Api.Dtos;

public class UserRequest
{
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool? Active { get; set; }
    public HashSet<long>? RoleIds { get; set; }
    public long? DepartmentId { get; set; }
}

public class UserDto
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool Active { get; set; }
    public HashSet<long> RoleIds { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
    public HashSet<string> Permissions { get; set; } = new();
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
}
