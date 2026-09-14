namespace SchoolPerformance.Api.Common;

/// <summary>Business rule violation. Surfaces to the client as HTTP 400 with an Arabic message.</summary>
public class AppException : Exception
{
    public int StatusCode { get; }

    public AppException(string message, int statusCode = StatusCodes.Status400BadRequest) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message, StatusCodes.Status404NotFound) { }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string message) : base(message, StatusCodes.Status403Forbidden) { }
}
