// Meridian.Api/Controllers/AskController.cs
[ApiController]
[Route("api/v1/ask")]
[Authorize]
public sealed class AskController(
    IQuestionParser parser,
    IResearchRetriever retriever,
    IAuthorizationService authorization,
    IChatCompletionClient llm) : ControllerBase
{
    private const string SystemPrompt =
        "You are a market research assistant. Answer ONLY from the numbered sources provided. " +
        "Cite every figure as [n]. If the sources do not answer the question, say so. Never estimate numbers.";

    [HttpPost]
    [EnableRateLimiting("ask")] // per-user token bucket
    public async Task<ActionResult<AskResponse>> Ask(AskRequest request, CancellationToken ct)
    {
        var intent = parser.Parse(request.Question);                    // categories, countries, companies, metric
        var candidates = await retriever.RetrieveAsync(intent, request.Question, top: 8, ct);

        // Entitlement filter BEFORE anything reaches the model.
        var sources = new List<RetrievedSource>();
        var withheld = 0;
        foreach (var source in candidates)
        {
            var ok = source.Market is null
                || (await authorization.AuthorizeAsync(User, source.Market, Policies.CanReadMarket)).Succeeded;
            if (ok) sources.Add(source); else withheld++;
        }

        if (sources.Count == 0)
        {
            return Ok(AskResponse.NoAccessibleSources(withheld));
        }

        var context = string.Join("\n\n", sources.Select((s, i) => $"[{i + 1}] {s.Title}\n{s.Passage}"));
        var completion = await llm.CompleteAsync(SystemPrompt, $"Sources:\n{context}\n\nQuestion: {request.Question}", ct);

        return Ok(new AskResponse(
            Answer: completion.Text,
            Sources: sources.Select((s, i) => new SourceRef(i + 1, s.Title, s.Url)).ToList(),
            WithheldSourceCount: withheld));
    }
}
