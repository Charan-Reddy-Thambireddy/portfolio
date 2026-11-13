// tests/Meridian.Api.Tests/MarketEntitlementHandlerTests.cs
public sealed class MarketEntitlementHandlerTests
{
    private static readonly SubscriptionPlan DrinksApac = new(
        Industries: ["drinks"], Countries: ["IN", "CN", "ID", "JP"]);

    private static async Task<bool> IsAllowed(MarketKey market, SubscriptionPlan? plan, string? orgId = "org-1")
    {
        var subscriptions = Substitute.For<ISubscriptionStore>();
        subscriptions.GetPlanAsync("org-1").Returns(plan);

        var taxonomy = Substitute.For<ITaxonomy>();
        taxonomy.IndustryOf("tea").Returns("drinks");
        taxonomy.IndustryOf("skin-care").Returns("beauty");

        var claims = orgId is null ? Array.Empty<Claim>() : [new Claim("org_id", orgId)];
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        var requirement = new MarketEntitlementRequirement();
        var context = new AuthorizationHandlerContext([requirement], user, market);

        await new MarketEntitlementHandler(subscriptions, taxonomy, NullLogger<MarketEntitlementHandler>.Instance)
            .HandleAsync(context);
        return context.HasSucceeded;
    }

    [Fact]
    public async Task Allows_a_market_inside_the_plan() =>
        Assert.True(await IsAllowed(new MarketKey("tea", "CN"), DrinksApac));

    [Theory]
    [InlineData("tea", "DE")]        // country outside the plan
    [InlineData("skin-care", "IN")]  // industry outside the plan
    [InlineData("unknown", "IN")]    // category not in the taxonomy
    public async Task Withholds_a_market_outside_the_plan(string category, string country) =>
        Assert.False(await IsAllowed(new MarketKey(category, country), DrinksApac));

    [Fact]
    public async Task Withholds_everything_without_an_organisation_claim() =>
        Assert.False(await IsAllowed(new MarketKey("tea", "CN"), DrinksApac, orgId: null));

    [Fact]
    public async Task Withholds_everything_when_the_organisation_has_no_plan() =>
        Assert.False(await IsAllowed(new MarketKey("tea", "CN"), plan: null));
}
