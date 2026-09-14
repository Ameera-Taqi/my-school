using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/org-structure")]
public class OrgStructureController : ControllerBase
{
    private readonly OrgStructureService _service;

    public OrgStructureController(OrgStructureService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Perms.OrgStructureView)]
    public async Task<ActionResult<OrgStructureDto>> Get() => Ok(await _service.BuildAsync());
}
