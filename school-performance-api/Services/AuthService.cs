using Microsoft.EntityFrameworkCore;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Entities;
using SchoolPerformance.Api.Security;

namespace SchoolPerformance.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;
    private readonly PermissionService _permissionService;
    private readonly DepartmentHeadScopeService _scopeService;

    public AuthService(AppDbContext db, JwtTokenService jwt, PermissionService permissionService, DepartmentHeadScopeService scopeService)
    {
        _db = db;
        _jwt = jwt;
        _permissionService = permissionService;
        _scopeService = scopeService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException("اسم المستخدم أو كلمة المرور غير صحيحة", StatusCodes.Status401Unauthorized);
        }
        if (!user.Active)
        {
            throw new AppException("الحساب غير مفعّل", StatusCodes.Status401Unauthorized);
        }
        return await BuildLoginResponseAsync(user, _jwt.GenerateToken(user));
    }

    /// <summary>Teachers belong to a department even when they are not its head, so department files can reach them.</summary>
    private async Task AttachTeacherDepartmentAsync(User user, LoginResponse response)
    {
        var teacher = await _db.Teachers
            .Include(t => t.Department)
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.DepartmentId != null);
        if (teacher?.Department == null)
        {
            return;
        }

        response.DepartmentId = teacher.Department.Id;
        response.DepartmentName = teacher.Department.Name;
        response.DepartmentCode = teacher.Department.Code;
        response.DepartmentSubjects = await _db.Teachers
            .Where(t => t.DepartmentId == teacher.DepartmentId && t.Specialization != null && t.Specialization.Trim() != "")
            .Select(t => t.Specialization!.Trim())
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();
    }

    public async Task<LoginResponse> BuildLoginResponseAsync(User user, string? token)
    {
        var scope = await _scopeService.ResolveForUserAsync(user);
        var response = new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Roles = user.Roles.Select(r => r.RoleKey).ToHashSet(),
            RoleNames = user.Roles.Select(r => r.RoleName).ToList(),
            Permissions = await _permissionService.GetPermissionsForUserAsync(user),
            TeacherId = await _db.Teachers.Where(t => t.UserId == user.Id).Select(t => (long?)t.Id).FirstOrDefaultAsync()
        };
        if (scope != null)
        {
            response.DepartmentId = scope.DepartmentId;
            response.DepartmentName = scope.DepartmentName;
            response.DepartmentCode = scope.DepartmentCode;
            response.DepartmentSubjects = scope.Subjects;
        }
        else
        {
            await AttachTeacherDepartmentAsync(user, response);
        }
        return response;
    }

    public async Task<ProfileDto> GetProfileAsync(User user)
    {
        var login = await BuildLoginResponseAsync(user, null);
        var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
        return new ProfileDto
        {
            UserId = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = string.IsNullOrWhiteSpace(user.Email) ? teacher?.Email : user.Email,
            Phone = string.IsNullOrWhiteSpace(user.Phone) ? teacher?.Phone : user.Phone,
            Roles = login.Roles.ToList(),
            RoleNames = login.RoleNames,
            DepartmentName = login.DepartmentName
        };
    }

    public async Task<ProfileDto> UpdateProfileAsync(User user, UpdateProfileRequest request)
    {
        var fullName = request.FullName.Trim();
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new AppException("الاسم مطلوب");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (email != null && !email.Contains('@'))
        {
            throw new AppException("البريد الإلكتروني غير صحيح");
        }
        if (email != null && await _db.Users.AnyAsync(u => u.Id != user.Id && u.Email == email))
        {
            throw new AppException("البريد الإلكتروني مستخدم لحساب آخر");
        }

        var newPassword = request.NewPassword?.Trim();
        if (!string.IsNullOrEmpty(newPassword))
        {
            if (newPassword.Length < 6)
            {
                throw new AppException("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
            }
            if (string.IsNullOrEmpty(request.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                throw new AppException("كلمة المرور الحالية غير صحيحة");
            }
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        }

        var previousName = user.FullName;
        user.FullName = fullName;
        user.Email = email;
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
        if (teacher != null)
        {
            if (teacher.FullName == previousName)
            {
                teacher.FullName = user.FullName;
            }
            else if (teacher.FullName == "أ. " + previousName)
            {
                teacher.FullName = "أ. " + user.FullName;
            }
            teacher.Email = user.Email;
            teacher.Phone = user.Phone;
        }

        await _db.SaveChangesAsync();
        return await GetProfileAsync(user);
    }
}
