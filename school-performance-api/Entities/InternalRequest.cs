namespace SchoolPerformance.Api.Entities;

public enum RequestType { GENERAL, LEAVE, SUPPLY, MAINTENANCE, OTHER }

public enum RequestStatus { PENDING, APPROVED, REJECTED, IN_REVIEW }

public class InternalRequest : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public RequestType RequestType { get; set; } = RequestType.GENERAL;
    public RequestStatus Status { get; set; } = RequestStatus.PENDING;
    public long RequestedById { get; set; }
    public User RequestedBy { get; set; } = null!;
}
