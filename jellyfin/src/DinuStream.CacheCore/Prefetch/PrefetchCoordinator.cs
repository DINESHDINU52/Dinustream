using System.Collections.Concurrent;
using System.Threading.Channels;
using DinuStream.CacheCore.Configuration;
using DinuStream.CacheCore.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore.Prefetch;

/// <summary>
/// Background prefetch coordinator that downloads upcoming media chunks asynchronously based on playback position.
/// </summary>
public sealed class PrefetchCoordinator : IAsyncDisposable
{
    private readonly CacheConfiguration _config;
    private readonly ILogger<PrefetchCoordinator> _logger;
    private readonly Channel<PrefetchRequest> _prefetchQueue;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _workerTask;
    private readonly ConcurrentDictionary<(string MediaId, long ChunkIndex), bool> _enqueuedItems = new();

    // Callback invoked to fetch a chunk asynchronously
    private Func<string, long, CancellationToken, Task>? _fetchChunkAction;

    public PrefetchCoordinator(IOptions<CacheConfiguration> config, ILogger<PrefetchCoordinator> logger)
    {
        _config = config.Value;
        _logger = logger;
        _prefetchQueue = Channel.CreateUnbounded<PrefetchRequest>(new UnboundedChannelOptions
        {
            SingleReader = true
        });

        _workerTask = Task.Run(ProcessQueueAsync);
    }

    public void SetFetchHandler(Func<string, long, CancellationToken, Task> fetchHandler)
    {
        _fetchChunkAction = fetchHandler;
    }

    /// <summary>
    /// Schedules prefetching for upcoming chunks ahead of current playback position.
    /// </summary>
    /// <param name="mediaId">Media identifier</param>
    /// <param name="currentChunkIndex">Currently accessed chunk</param>
    /// <param name="totalChunks">Total chunks for this file</param>
    /// <param name="bitrateBitsPerSec">Optional media bitrate to calculate lookahead</param>
    public void NotifyChunkAccessed(string mediaId, long currentChunkIndex, long totalChunks, long? bitrateBitsPerSec = null)
    {
        if (!_config.PrefetchEnabled)
        {
            return;
        }

        int lookaheadChunks = CalculateLookaheadChunks(bitrateBitsPerSec);

        for (int i = 1; i <= lookaheadChunks; i++)
        {
            long targetChunk = currentChunkIndex + i;
            if (targetChunk >= totalChunks)
            {
                break;
            }

            var key = (mediaId, targetChunk);
            if (_enqueuedItems.TryAdd(key, true))
            {
                _prefetchQueue.Writer.TryWrite(new PrefetchRequest(mediaId, targetChunk));
            }
        }
    }

    private int CalculateLookaheadChunks(long? bitrateBitsPerSec)
    {
        if (bitrateBitsPerSec.HasValue && bitrateBitsPerSec.Value > 0)
        {
            // Estimate bytes needed for PrefetchDuration
            double durationSeconds = _config.PrefetchDuration.TotalSeconds;
            long bytesNeeded = (long)((bitrateBitsPerSec.Value / 8.0) * durationSeconds);
            int chunks = (int)Math.Ceiling((double)bytesNeeded / _config.ChunkSizeBytes);
            return Math.Clamp(chunks, 1, 20); // reasonable clamp
        }

        return _config.PrefetchChunksAhead;
    }

    private async Task ProcessQueueAsync()
    {
        try
        {
            while (await _prefetchQueue.Reader.WaitToReadAsync(_cts.Token).ConfigureAwait(false))
            {
                while (_prefetchQueue.Reader.TryRead(out var req))
                {
                    _cts.Token.ThrowIfCancellationRequested();

                    try
                    {
                        if (_fetchChunkAction != null)
                        {
                            _logger.LogDebug("Prefetching chunk {ChunkIndex} for media {MediaId}", req.ChunkIndex, req.MediaId);
                            await _fetchChunkAction(req.MediaId, req.ChunkIndex, _cts.Token).ConfigureAwait(false);
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Prefetch failed for chunk {ChunkIndex} of media {MediaId}", req.ChunkIndex, req.MediaId);
                    }
                    finally
                    {
                        _enqueuedItems.TryRemove((req.MediaId, req.ChunkIndex), out _);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Clean exit
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Prefetch worker encountered unexpected error.");
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _cts.CancelAsync().ConfigureAwait(false);
        _prefetchQueue.Writer.Complete();
        try
        {
            await _workerTask.ConfigureAwait(false);
        }
        catch
        {
            // Ignore cancel exceptions during shutdown
        }
        _cts.Dispose();
    }

    private sealed record PrefetchRequest(string MediaId, long ChunkIndex);
}
