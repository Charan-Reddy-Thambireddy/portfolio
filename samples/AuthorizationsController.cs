// Program.cs: XML comments feed the Swagger UI and the published OpenAPI spec.
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "CareBridge API", Version = "v1" });
    options.IncludeXmlComments(
        Path.Combine(AppContext.BaseDirectory, $"{typeof(Program).Assembly.GetName().Name}.xml"));
});

// Controllers/Api/AuthorizationsController.cs
[ApiController]
[Route("api/v1/cases")]
[Produces("application/json")]
public sealed class AuthorizationsController(ICaseService cases) : ControllerBase
{
    /// <summary>Records an approve or deny decision on a pending service authorization.</summary>
    /// <param name="caseId">Case record ID.</param>
    /// <param name="authorizationId">Service authorization ID on that case.</param>
    /// <param name="request">The decision, plus a plain-language reason when denying.</param>
    /// <param name="ct">Request cancellation.</param>
    /// <response code="200">Decision recorded; returns the updated authorization.</response>
    /// <response code="400">Validation failed, for example a denial without a reason.</response>
    /// <response code="404">No such authorization on this case.</response>
    /// <response code="409">Another reviewer already decided this authorization.</response>
    [HttpPost("{caseId:int}/authorizations/{authorizationId:int}/decision")]
    [Authorize(Policy = "CanDecideAuthorizations")]
    [ProducesResponseType<ServiceAuthorizationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Decide(
        int caseId, int authorizationId, AuthorizationDecisionRequest request, CancellationToken ct)
    {
        var outcome = await cases.DecideAuthorizationAsync(caseId, authorizationId, request, ct);

        return outcome.Kind switch
        {
            DecisionResultKind.Success => Ok(outcome.Authorization),
            DecisionResultKind.NotFound => NotFound(),
            DecisionResultKind.AlreadyDecided => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Authorization already decided"),
            _ => throw new UnreachableException()
        };
    }
}
