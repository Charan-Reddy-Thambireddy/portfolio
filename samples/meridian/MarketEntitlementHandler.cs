// Meridian.Api/Authorization/MarketEntitlementHandler.cs
public sealed class MarketEntitlementRequirement : IAuthorizationRequirement;

/// <summary>
/// Authorizes one category × country pair against the caller's organisation subscription.
/// Authentication tells us who the user is; this decides what they may read.
/// </summary>
public sealed class MarketEntitlementHandler(
    ISubscriptionStore subscriptions,
    ITaxonomy taxonomy,
    ILogger<MarketEntitlementHandler> logger)
    : AuthorizationHandler<MarketEntitlementRequirement, MarketKey>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, MarketEntitlementRequirement requirement, MarketKey market)
    {
        var orgId = context.User.FindFirstValue("org_id");
        if (orgId is null)
        {
            return; // no organisation claim: not entitled to anything
        }

        // Cached per organisation (Redis, 10 minutes) and evicted when a plan changes.
        var plan = await subscriptions.GetPlanAsync(orgId);
        var industry = taxonomy.IndustryOf(market.CategoryId);

        if (plan is not null && industry is not null
            && plan.Industries.Contains(industry)
            && plan.Countries.Contains(market.CountryId))
        {
            context.Succeed(requirement);
            return;
        }

        logger.LogInformation("Withheld {Category}/{Country} for org {OrgId}", market.CategoryId, market.CountryId, orgId);
    }
}

// Program.cs
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.CanReadMarket, p => p.AddRequirements(new MarketEntitlementRequirement()));
builder.Services.AddScoped<IAuthorizationHandler, MarketEntitlementHandler>();
