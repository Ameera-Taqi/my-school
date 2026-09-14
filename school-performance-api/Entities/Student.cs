namespace SchoolPerformance.Api.Entities;

public enum Gender { MALE, FEMALE }

public enum StudentStatus { ACTIVE, TRANSFERRED, SUSPENDED }

public class Student : BaseEntity
{
    public string CivilId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public Gender Gender { get; set; } = Gender.MALE;
    public string? GuardianPhone { get; set; }
    public StudentStatus Status { get; set; } = StudentStatus.ACTIVE;
    public string? Notes { get; set; }
    public long SchoolClassId { get; set; }
    public SchoolClass SchoolClass { get; set; } = null!;
}
