namespace SchoolPerformance.Api.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool Active { get; set; } = true;
    public ICollection<Role> Roles { get; set; } = new List<Role>();
}
