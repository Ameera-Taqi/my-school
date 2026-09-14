namespace SchoolPerformance.Api.Entities;

public class Teacher : BaseEntity
{
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Specialization { get; set; }
    public DateOnly? HireDate { get; set; }
    public long? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public long? UserId { get; set; }
    public User? User { get; set; }
    public bool Active { get; set; } = true;
}
