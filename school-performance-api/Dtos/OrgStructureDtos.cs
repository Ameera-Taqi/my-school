namespace SchoolPerformance.Api.Dtos;

public class OrgPersonDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string RoleKey { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Specialization { get; set; }
    public string? EmployeeNumber { get; set; }
    public bool Active { get; set; }
}

public class OrgDepartmentDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public OrgPersonDto? Head { get; set; }
    public List<OrgPersonDto> Teachers { get; set; } = new();
}

public class OrgStructureDto
{
    public List<OrgPersonDto> Managers { get; set; } = new();
    public List<OrgPersonDto> AssistantManagers { get; set; } = new();
    public List<OrgDepartmentDto> Departments { get; set; } = new();
    /// <summary>Department heads whose department could not be resolved.</summary>
    public List<OrgPersonDto> UnassignedHeads { get; set; } = new();
    /// <summary>Teachers with no department.</summary>
    public List<OrgPersonDto> UnassignedTeachers { get; set; } = new();
    public int TotalPeople { get; set; }
    public DateTime GeneratedAt { get; set; }
}
