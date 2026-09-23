using DinuStream.CacheCore.Configuration;
using DinuStream.CacheCore.Eviction;
using DinuStream.CacheCore.Index;
using DinuStream.CacheCore.Locking;
using DinuStream.CacheCore.Model;
using DinuStream.CacheCore.Prefetch;
using DinuStream.CacheCore.Storage;
using DinuStream.CacheCore.Streams;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore;

/// <summary>
/// Main coordinator for the DinuStream SSD cache engine.
/// Ties together SSD block storage, Google Drive range requests, single-flight deduplication,
/// LRU cache eviction, and lookahead prefetching.
/// </summary>
public sealed class CacheManager : IAsyncDisposable
{
    private readonly CacheConfiguration _config;
    private readonly IGoogleDriveStorage _storage;
    private readonly SsdBlockManager _blockManager;
    private readonly IChunkIndex _index;
    private readonly ChunkLockManager _lockManager;
    private readonly CacheEvictionManager _evictionManager;
    private readonly PrefetchCoordinator _prefetchCoordinator;
    private readonly ILogger<CacheManager> _logger;

    public CacheManager(
        IOptions<CacheConfiguration> config,
        IGoogleDriveStorage storage,
        SsdBlockManager blockManager,
        IChunkIndex index,
        ChunkLockManager lockManager,
        CacheEvictionManager evictionManager,
        PrefetchCoordinator prefetchCoordinator,
        ILogger<CacheManager> logger)
    {
        _config = config.Value;
        _storage = storage;
        _blockManager = blockManager;
        _index = index;
        _lockManager = lockManager;
        _evictionManager = evictionManager;
        _prefetchCoordinator = prefetchCoordinator;
        _logger = logger;

        // Wire up prefetch coordinator to fetch chunks via this CacheManager
        _prefetchCoordinator.SetFetchHandler(async (mediaId, chunkIndex, ct) =>
        {
            var meta = await _index.GetMetadataAsync(mediaId, ct).ConfigureAwait(false);
            if (meta != null && !meta.HasChunk(chunkIndex))
            {
                await GetOrFetchChunkAsync(mediaId, meta.GoogleDriveFileId, chunkIndex, meta.TotalFileSize, ct).ConfigureAwait(false);
            }
        });
    }

    /// <summary>
    /// Gets a chunk from SSD cache if present, or downloads it on-demand from Google Drive.
    /// Multi-user concurrent calls for the same chunk are deduplicated via single-flight.
    /// </summary>
    public async Task<byte[]> GetOrFetchChunkAsync(
        string mediaId,
        string googleDriveFileId,
        long chunkIndex,
        long totalFileSize,
        CancellationToken cancellationToken = default)
    {
        long chunkSize = _config.ChunkSizeBytes;
        long totalChunks = ChunkCalculation.GetTotalChunks(totalFileSize, chunkSize);

        // 1. Check if chunk already exists on SSD
        if (_blockManager.ChunkExists(mediaId, chunkIndex))
        {
            _logger.LogTrace("Cache HIT for media {MediaId}, chunk {ChunkIndex}", mediaId, chunkIndex);

            using (_lockManager.AcquireReadLock(mediaId, chunkIndex))
            {
                var data = await _blockManager.ReadChunkAsync(mediaId, chunkIndex, cancellationToken).ConfigureAwait(false);
                await _index.TouchChunkAsync(mediaId, chunkIndex, cancellationToken).ConfigureAwait(false);

                // Notify prefetch lookahead
                _prefetchCoordinator.NotifyChunkAccessed(mediaId, chunkIndex, totalChunks);

                return data;
            }
        }

        // 2. Cache MISS: Download on-demand from Google Drive using single-flight deduplication
        _logger.LogInformation("Cache MISS for media {MediaId}, chunk {ChunkIndex}. Downloading from Google Drive...", mediaId, chunkIndex);

        var chunkData = await _lockManager.ExecuteSingleFlightAsync(
            mediaId,
            chunkIndex,
            async () =>
            {
                // Double check if written by another thread while waiting
                if (_blockManager.ChunkExists(mediaId, chunkIndex))
                {
                    return await _blockManager.ReadChunkAsync(mediaId, chunkIndex, cancellationToken).ConfigureAwait(false);
                }

                // Download specific chunk range from Google Drive
                var (startByte, endByte, _) = ChunkCalculation.GetChunkRange(chunkIndex, chunkSize, totalFileSize);
                var downloaded = await _storage.DownloadChunkAsync(
                    googleDriveFileId,
                    startByte,
                    endByte,
                    cancellationToken).ConfigureAwait(false);

                // Write atomically to SSD
                await _blockManager.WriteChunkAsync(mediaId, chunkIndex, downloaded, cancellationToken).ConfigureAwait(false);

                // Record in index
                await _index.RecordChunkCachedAsync(
                    mediaId,
                    googleDriveFileId,
                    totalFileSize,
                    chunkSize,
                    chunkIndex,
                    downloaded.Length,
                    cancellationToken: cancellationToken).ConfigureAwait(false);

                if (_config.EnableAutomaticCleanup)
                {
                    // Enforce cache size limits (LRU eviction) in background
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _evictionManager.EnforceLimitAsync().ConfigureAwait(false);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Background LRU eviction error.");
                        }
                    });
                }

                return downloaded;
            },
            cancellationToken).ConfigureAwait(false);

        // Notify prefetch lookahead
        _prefetchCoordinator.NotifyChunkAccessed(mediaId, chunkIndex, totalChunks);

        return chunkData;
    }

    /// <summary>
    /// Reads an arbitrary byte range [offset, offset + count - 1] across chunk boundaries on-demand.
    /// </summary>
    public async Task<int> ReadRangeAsync(
        string mediaId,
        string googleDriveFileId,
        long offset,
        byte[] destination,
        int destinationOffset,
        int count,
        long totalFileSize,
        CancellationToken cancellationToken = default)
    {
        if (offset >= totalFileSize || count <= 0)
        {
            return 0;
        }

        int bytesToRead = (int)Math.Min(count, totalFileSize - offset);
        int bytesReadTotal = 0;
        long chunkSize = _config.ChunkSizeBytes;

        while (bytesReadTotal < bytesToRead)
        {
            long currentOffset = offset + bytesReadTotal;
            long chunkIndex = ChunkCalculation.GetChunkIndexForByte(currentOffset, chunkSize);
            long offsetWithinChunk = currentOffset % chunkSize;

            var chunkData = await GetOrFetchChunkAsync(
                mediaId,
                googleDriveFileId,
                chunkIndex,
                totalFileSize,
                cancellationToken).ConfigureAwait(false);

            int availableInChunk = (int)Math.Min(chunkData.Length - offsetWithinChunk, bytesToRead - bytesReadTotal);
            if (availableInChunk <= 0)
            {
                break;
            }

            Array.Copy(chunkData, offsetWithinChunk, destination, destinationOffset + bytesReadTotal, availableInChunk);
            bytesReadTotal += availableInChunk;
        }

        return bytesReadTotal;
    }

    /// <summary>
    /// Opens a seekable, readable Stream over the cached media file.
    /// </summary>
    public Stream OpenStream(string mediaId, string googleDriveFileId, long totalFileSize, long? bitrate = null)
    {
        return new DinuStreamChunkedStream(this, mediaId, googleDriveFileId, totalFileSize, bitrate);
    }

    public async ValueTask DisposeAsync()
    {
        await _prefetchCoordinator.DisposeAsync().ConfigureAwait(false);
    }
}
