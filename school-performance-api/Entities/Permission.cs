namespace SchoolPerformance.Api.Entities;

public class Permission : BaseEntity
{
    public string PermissionKey { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Active { get; set; } = true;
}
