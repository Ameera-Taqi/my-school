using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SchoolPerformance.Api.Common;
using SchoolPerformance.Api.Data;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;
using SchoolPerformance.Api.Services.Scheduling;

var builder = WebApplication.CreateBuilder(args);

// ---- Database ---------------------------------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured");
// No retrying execution strategy: services open explicit transactions, which that strategy does not allow.
// Database warm-up at startup is handled by the migration retry loop below.
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// ---- MVC / JSON -------------------------------------------------------------------------------
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Match the { "message": "..." } error shape the frontend expects.
        options.InvalidModelStateResponseFactory = context =>
        {
            var message = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m)) ?? "بيانات غير صالحة";
            return new BadRequestObjectResult(new { message });
        };
    });
builder.Services.AddHttpContextAccessor();

// ---- CORS -------------------------------------------------------------------------------------
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// ---- Authentication / authorization ------------------------------------------------------------
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            NameClaimType = JwtRegisteredClaimNames.Sub,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync("{\"message\":\"غير مصرح، يرجى تسجيل الدخول\"}");
            }
        };
    });
// Every endpoint requires a valid token unless explicitly marked [AllowAnonymous].
builder.Services.AddAuthorization(options =>
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// ---- Application services ---------------------------------------------------------------------
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<CurrentUserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<PermissionManagementService>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<RolePermissionService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<DepartmentService>();
builder.Services.AddScoped<DepartmentHeadScopeService>();
builder.Services.AddScoped<TeacherService>();
builder.Services.AddScoped<TeacherMonitoringService>();
builder.Services.AddScoped<AcademicStageService>();
builder.Services.AddScoped<SchoolClassService>();
builder.Services.AddScoped<StudentService>();
builder.Services.AddScoped<CalendarEventService>();
builder.Services.AddScoped<MeetingService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<AttendanceService>();
builder.Services.AddScoped<OrgStructureService>();
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<DataSeeder>();

var app = builder.Build();

// ---- Schema + seed on startup -------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var attempt = 0;
    while (true)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex) when (attempt++ < 12)
        {
            logger.LogWarning("Database not ready yet ({Attempt}/12): {Message}", attempt, ex.Message);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
    await scope.ServiceProvider.GetRequiredService<DataSeeder>().SeedAsync();
}

// ---- Pipeline -----------------------------------------------------------------------------------
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "UP" })).AllowAnonymous();

app.Run();
