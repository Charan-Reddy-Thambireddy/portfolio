// Meridian.Api/Controllers/MarketDataController.cs
[ApiController]
[Route("api/v1/market-data")]
[Authorize] // Azure AD bearer token (OAuth 2.0 / OIDC)
public sealed class MarketDataController(
    IMarketDataService marketData,
    IAuthorizationService authorization) : ControllerBase
{
    /// <summary>Returns yearly series for every category × country pair the caller is entitled to.</summary>
    /// <response code="200">Series for entitled pairs, plus the pairs that were withheld.</response>
    /// <response code="400">Unknown category, country or metric, or an invalid year range.</response>
    [HttpPost("series")]
    [ProducesResponseType<SeriesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSeries(SeriesRequest request, CancellationToken ct)
    {
        var allowed = new List<MarketKey>();
        var withheld = new List<MarketKey>();

        foreach (var key in request.Markets())
        {
            // Resource-based check: the plan must cover the category's industry AND the country.
            var result = await authorization.AuthorizeAsync(User, key, Policies.CanReadMarket);
            (result.Succeeded ? allowed : withheld).Add(key);
        }

        var series = allowed.Count == 0
            ? []
            : await marketData.GetSeriesAsync(allowed, request.Metric, request.FromYear, request.ToYear, ct);

        // Withheld pairs are named so the UI can explain them; their data never leaves the API.
        return Ok(new SeriesResponse(series, withheld));
    }
}

public sealed record SeriesRequest(
    [property: Required, MinLength(1), MaxLength(20)] IReadOnlyList<string> Categories,
    [property: Required, MinLength(1), MaxLength(20)] IReadOnlyList<string> Countries,
    [property: Required] Metric Metric,
    [property: Range(2019, 2030)] int FromYear = 2019,
    [property: Range(2019, 2030)] int ToYear = 2030) : IValidatableObject
{
    public IEnumerable<MarketKey> Markets() =>
        Categories.Distinct().SelectMany(c => Countries.Distinct().Select(g => new MarketKey(c, g)));

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (FromYear > ToYear)
            yield return new ValidationResult("FromYear must not be after ToYear.", [nameof(FromYear)]);
    }
}
