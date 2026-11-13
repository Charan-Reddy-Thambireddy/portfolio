// Meridian.Indexer/DataReleaseConsumer.cs
/// <summary>
/// Listens for "data release published" events. Each release bumps the cache version
/// (old cached series stop being read) and re-indexes the affected reports for search.
/// </summary>
public sealed class DataReleaseConsumer(
    IConsumer<string, DataReleasePublished> consumer,
    IReleaseVersion release,
    ISearchIndexer indexer,
    ILogger<DataReleaseConsumer> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        consumer.Subscribe("meridian.data-releases");

        while (!stoppingToken.IsCancellationRequested)
        {
            ConsumeResult<string, DataReleasePublished>? result = null;
            try
            {
                result = consumer.Consume(stoppingToken);
                var evt = result.Message.Value;

                await release.SetAsync(evt.ReleaseId, stoppingToken);
                await indexer.ReindexAsync(evt.CategoryIds, evt.CountryIds, stoppingToken);

                // Commit only after the work succeeded: at-least-once, and reindexing is idempotent.
                consumer.Commit(result);
                logger.LogInformation("Applied release {ReleaseId} ({Count} categories)", evt.ReleaseId, evt.CategoryIds.Count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Leave the offset uncommitted so the event is retried; back off briefly.
                logger.LogError(ex, "Failed to apply release at offset {Offset}", result?.TopicPartitionOffset);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        consumer.Close();
    }
}
