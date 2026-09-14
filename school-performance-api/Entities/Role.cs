namespace SchoolPerformance.Api.Entities;

public class Role : BaseEntity
{
    public string RoleKey { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Active { get; set; } = true;
}
