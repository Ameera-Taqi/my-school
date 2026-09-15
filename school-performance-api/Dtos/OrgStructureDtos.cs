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

public class OrgSubjectDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Color { get; set; }
    public List<OrgPersonDto> Teachers { get; set; } = new();
}

public class OrgDepartmentDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public OrgPersonDto? Head { get; set; }
    public List<OrgSubjectDto> Subjects { get; set; } = new();
    /// <summary>Teachers in the department not placed under a subject.</summary>
    public List<OrgPersonDto> Teachers { get; set; } = new();
}

/// <summary>Vice-principal branch with the departments under their supervision.</summary>
public class OrgAssistantBranchDto
{
    public OrgPersonDto Person { get; set; } = null!;
    public List<OrgDepartmentDto> Departments { get; set; } = new();
}

public class OrgStructureDto
{
    public List<OrgPersonDto> Managers { get; set; } = new();
    public List<OrgAssistantBranchDto> AssistantBranches { get; set; } = new();
    /// <summary>Kept for compatibility; prefer AssistantBranches.</summary>
    public List<OrgPersonDto> AssistantManagers { get; set; } = new();
    public List<OrgDepartmentDto> Departments { get; set; } = new();
    public List<OrgPersonDto> UnassignedHeads { get; set; } = new();
    public List<OrgPersonDto> UnassignedTeachers { get; set; } = new();
    public int TotalPeople { get; set; }
    public DateTime GeneratedAt { get; set; }
}
