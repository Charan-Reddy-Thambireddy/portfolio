// Meridian.Api/Services/MarketDataService.cs
public sealed class MarketDataService(
    MeridianDbContext db,
    IDistributedCache cache,          // Redis
    IReleaseVersion release,          // bumped by the data-release consumer
    ILogger<MarketDataService> logger) : IMarketDataService
{
    private static readonly DistributedCacheEntryOptions CacheFor =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6) };

    public async Task<IReadOnlyList<MarketSeries>> GetSeriesAsync(
        IReadOnlyList<MarketKey> markets, Metric metric, int fromYear, int toYear, CancellationToken ct)
    {
        // The release number is part of the key, so a new data release never serves stale figures.
        var key = $"series:v{await release.CurrentAsync(ct)}:{metric}:{fromYear}-{toYear}:"
                + string.Join(',', markets.OrderBy(m => m.CategoryId).ThenBy(m => m.CountryId).Select(m => $"{m.CategoryId}/{m.CountryId}"));

        if (await cache.GetStringAsync(key, ct) is { } hit)
        {
            return JsonSerializer.Deserialize<List<MarketSeries>>(hit)!;
        }

        var categoryIds = markets.Select(m => m.CategoryId).Distinct().ToArray();
        var countryIds = markets.Select(m => m.CountryId).Distinct().ToArray();
        var wanted = markets.ToHashSet();

        // One round trip; the covering index on (MetricId, CategoryId, CountryId, Year) serves it.
        var rows = await db.MarketValues
            .AsNoTracking()
            .Where(v => v.Metric == metric
                     && categoryIds.Contains(v.CategoryId)
                     && countryIds.Contains(v.CountryId)
                     && v.Year >= fromYear && v.Year <= toYear)
            .Select(v => new { v.CategoryId, v.CountryId, v.Year, v.Value, v.IsForecast, v.Unit })
            .ToListAsync(ct);

        var series = rows
            .Where(r => wanted.Contains(new MarketKey(r.CategoryId, r.CountryId)))
            .GroupBy(r => new MarketKey(r.CategoryId, r.CountryId))
            .Select(g => new MarketSeries(
                g.Key,
                g.First().Unit,
                g.OrderBy(r => r.Year).Select(r => new YearValue(r.Year, r.Value, r.IsForecast)).ToList()))
            .ToList();

        await cache.SetStringAsync(key, JsonSerializer.Serialize(series), CacheFor, ct);
        logger.LogDebug("Loaded {Count} series from SQL for {Key}", series.Count, key);
        return series;
    }
}
