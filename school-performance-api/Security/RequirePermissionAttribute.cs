using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SchoolPerformance.Api.Security;

/// <summary>
/// Allows the action when the caller holds ANY of the listed permission keys.
/// Permissions are read from the database on each request (cached per request), so role changes apply immediately.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequirePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string[] _anyOf;

    public RequirePermissionAttribute(params string[] anyOf)
    {
        _anyOf = anyOf.SelectMany(p => p.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).ToArray();
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new ObjectResult(new { message = "غير مصرح، يرجى تسجيل الدخول" }) { StatusCode = StatusCodes.Status401Unauthorized };
            return;
        }

        var current = context.HttpContext.RequestServices.GetRequiredService<CurrentUserService>();
        var permissions = await current.GetPermissionsAsync();
        if (_anyOf.Length == 0 || _anyOf.Any(permissions.Contains))
        {
            return;
        }

        context.Result = new ObjectResult(new { message = "ليس لديك صلاحية لتنفيذ هذا الإجراء" }) { StatusCode = StatusCodes.Status403Forbidden };
    }
}
