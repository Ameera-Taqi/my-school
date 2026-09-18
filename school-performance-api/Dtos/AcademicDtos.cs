namespace SchoolPerformance.Api.Dtos;

public class AcademicStageDto
{
    public long? Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public long ClassCount { get; set; }
    public long StudentCount { get; set; }
}

public class SchoolClassDto
{
    public long? Id { get; set; }
    public string? Name { get; set; }
    public int? Capacity { get; set; }
    public string? Notes { get; set; }
    public long? AcademicStageId { get; set; }
    public string? AcademicStageName { get; set; }
    public long StudentCount { get; set; }
}

public class StudentDto
{
    public long? Id { get; set; }
    public string? CivilId { get; set; }
    public string? FullName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? GuardianPhone { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public long? ClassId { get; set; }
    public string? ClassName { get; set; }
    public long? AcademicStageId { get; set; }
    public string? AcademicStageName { get; set; }
}

public class StudentImportItemDto
{
    public int Row { get; set; }
    public string? CivilId { get; set; }
    public string? FullName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? GuardianPhone { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}

public class StudentImportRequestDto
{
    public List<StudentImportItemDto> Students { get; set; } = [];
}

public class StudentImportErrorDto
{
    public int Row { get; set; }
    public string? CivilId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class StudentImportResultDto
{
    public int Created { get; set; }
    public int Failed { get; set; }
    public List<StudentImportErrorDto> Errors { get; set; } = [];
}
