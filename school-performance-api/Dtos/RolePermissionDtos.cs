namespace SchoolPerformance.Api.Dtos;

public class RoleDto
{
    public long? Id { get; set; }
    public string? RoleKey { get; set; }
    public string? RoleName { get; set; }
    public string? Description { get; set; }
    public bool? Active { get; set; }
}

public class PermissionDto
{
    public long? Id { get; set; }
    public string? PermissionKey { get; set; }
    public string? PermissionName { get; set; }
    public string? ModuleName { get; set; }
    public string? Description { get; set; }
    public bool? Active { get; set; }
}

public class PermissionAssignmentDto
{
    public long PermissionId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public bool Granted { get; set; }
}

public class RolePermissionDto
{
    public long RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public Dictionary<string, List<PermissionAssignmentDto>> PermissionsByModule { get; set; } = new();
}

public class SaveRolePermissionsRequest
{
    public long? RoleId { get; set; }
    public HashSet<long?>? PermissionIds { get; set; }
}
