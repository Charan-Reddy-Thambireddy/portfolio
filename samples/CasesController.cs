[Authorize(Roles = "Caseworker,Supervisor")]
[AutoValidateAntiforgeryToken]
public sealed class CasesController : Controller
{
    private readonly ICaseService _cases;

    public CasesController(ICaseService cases) => _cases = cases;

    // GET /Cases?Status=Pending&Program=MLTC&Sort=beneficiary&Page=2
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] CaseQueueQuery query, CancellationToken ct)
    {
        var model = new CaseQueueViewModel(query, await _cases.GetQueueAsync(query, ct));

        // The jQuery filter form asks for the table partial only, so results refresh in place.
        return Request.Headers.XRequestedWith == "XMLHttpRequest"
            ? PartialView("_CaseTable", model)
            : View(model);
    }

    [HttpPost("Cases/{caseId:int}/Authorizations/{authorizationId:int}/Decision")]
    public async Task<IActionResult> Decide(
        int caseId, int authorizationId, DecisionFormModel form, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            // Redisplay with server-side errors; the same rules also run client-side.
            ViewData["CaseId"] = caseId;
            ViewData["AuthorizationId"] = authorizationId;
            return View("Details", await _cases.GetDetailsAsync(caseId, form, ct));
        }

        var outcome = await _cases.DecideAuthorizationAsync(caseId, authorizationId, form.ToRequest(), ct);

        switch (outcome.Kind)
        {
            case DecisionResultKind.NotFound:
                return NotFound();
            case DecisionResultKind.AlreadyDecided:
                TempData["Notice"] = "Another reviewer already decided this authorization.";
                break;
            default:
                TempData["Notice"] = $"{outcome.Authorization!.ServiceName} was {outcome.Authorization.Status.ToString().ToLowerInvariant()}.";
                break;
        }

        // Post/Redirect/Get: a browser refresh never re-submits the decision.
        return RedirectToAction(nameof(Details), new { id = caseId });
    }
}
