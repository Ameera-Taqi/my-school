using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc;
using SchoolPerformance.Api.Dtos;
using SchoolPerformance.Api.Security;
using SchoolPerformance.Api.Services;

namespace SchoolPerformance.Api.Controllers;

[ApiController]
[Route("api/records")]
public class RecordsController : ControllerBase
{
    private readonly RecordService _service;

    public RecordsController(RecordService service)
    {
        _service = service;
    }

    [HttpGet("categories")]
    [RequirePermission(Perms.RecordsView)]
    public async Task<ActionResult<List<RecordCategoryDto>>> Categories() => Ok(await _service.CategoriesAsync());

    [HttpGet]
    [RequirePermission(Perms.RecordsView)]
    public async Task<ActionResult<RecordListResponse>> List([FromQuery] string? view, [FromQuery] string? q, [FromQuery] string? status, [FromQuery] long? categoryId) =>
        Ok(await _service.ListAsync(view, q, status, categoryId));

    [HttpGet("{id:long}")]
    [RequirePermission(Perms.RecordsView)]
    public async Task<ActionResult<RecordDetailDto>> Detail(long id) => Ok(await _service.DetailAsync(id));

    [HttpGet("{id:long}/file")]
    [RequirePermission(Perms.RecordsView)]
    public async Task<IActionResult> File(long id)
    {
        var (content, type, name) = await _service.FileAsync(id);
        Response.Headers.ContentDisposition = new ContentDispositionHeaderValue("inline") { FileNameStar = name }.ToString();
        return File(content, type);
    }

    [HttpPost]
    [RequirePermission(Perms.RecordsManage)]
    [RequestSizeLimit(11_000_000)]
    public async Task<ActionResult<RecordDetailDto>> Create([FromForm] string name, [FromForm] long categoryId, [FromForm] string? description, IFormFile file)
    {
        var content = await ReadAsync(file);
        return StatusCode(201, await _service.CreateAsync(name, categoryId, description, file.FileName, content));
    }

    [HttpPut("{id:long}")]
    [RequirePermission(Perms.RecordsManage)]
    [RequestSizeLimit(11_000_000)]
    public async Task<ActionResult<RecordDetailDto>> Update(long id, [FromForm] string name, [FromForm] long categoryId, [FromForm] string? description, [FromForm] string? rowVersion, IFormFile? file)
    {
        byte[]? content = file == null ? null : await ReadAsync(file);
        return Ok(await _service.UpdateAsync(id, name, categoryId, description, rowVersion, file?.FileName, content));
    }

    [HttpDelete("{id:long}")]
    [RequirePermission(Perms.RecordsManage)]
    public async Task<IActionResult> Delete(long id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("{id:long}/submit")]
    [RequirePermission(Perms.RecordsManage)]
    public async Task<ActionResult<RecordDetailDto>> Submit(long id) => Ok(await _service.SubmitAsync(id));

    [HttpPost("{id:long}/approve")]
    [RequirePermission(Perms.RecordsApprove)]
    public async Task<ActionResult<RecordDetailDto>> Approve(long id, [FromBody] RecordCommentRequest? body) =>
        Ok(await _service.ApproveAsync(id, body?.Comment));

    [HttpPost("{id:long}/reject")]
    [RequirePermission(Perms.RecordsApprove)]
    public async Task<ActionResult<RecordDetailDto>> Reject(long id, [FromBody] RecordCommentRequest? body) =>
        Ok(await _service.RejectAsync(id, body?.Comment));

    [HttpPost("{id:long}/return")]
    [RequirePermission(Perms.RecordsApprove)]
    public async Task<ActionResult<RecordDetailDto>> Return(long id, [FromBody] RecordCommentRequest? body) =>
        Ok(await _service.ReturnAsync(id, body?.Comment));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(Perms.RecordsManage)]
    public async Task<ActionResult<RecordDetailDto>> Cancel(long id) => Ok(await _service.CancelAsync(id));

    [HttpGet("notices")]
    [RequirePermission(Perms.RecordsView)]
    public async Task<ActionResult<List<RecordNoticeDto>>> Notices() => Ok(await _service.MyNoticesAsync());

    [HttpPost("notices/{id:long}/read")]
    [RequirePermission(Perms.RecordsView)]
    public async Task<IActionResult> ReadNotice(long id)
    {
        await _service.MarkNoticeReadAsync(id);
        return NoContent();
    }

    private static async Task<byte[]> ReadAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory);
        return memory.ToArray();
    }
}
