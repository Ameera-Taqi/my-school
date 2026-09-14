namespace SchoolPerformance.Api.Entities;

public class RolePermission : BaseEntity
{
    public long RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public long PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
    public bool Granted { get; set; } = true;
}
