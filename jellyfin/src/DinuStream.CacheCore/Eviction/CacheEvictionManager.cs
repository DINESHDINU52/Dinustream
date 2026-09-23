using DinuStream.CacheCore.Configuration;
using DinuStream.CacheCore.Index;
using DinuStream.CacheCore.Locking;
using DinuStream.CacheCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore.Eviction;

/// <summary>
/// Enforces LRU eviction when SSD cache size exceeds the configured limit.
/// Preserves active chunks (in-flight downloads or active readers).
/// Never deletes remote Google Drive content.
/// </summary>
public sealed class CacheEvictionManager : IDisposable
{
    private readonly IChunkIndex _index;
    private readonly SsdBlockManager _blockManager;
    private readonly ChunkLockManager _lockManager;
    private readonly CacheConfiguration _config;
    private readonly ILogger<CacheEvictionManager> _logger;
    private readonly SemaphoreSlim _evictionGate = new(1, 1);

    public CacheEvictionManager(
        IChunkIndex index,
        SsdBlockManager blockManager,
        ChunkLockManager lockManager,
        IOptions<CacheConfiguration> config,
        ILogger<CacheEvictionManager> logger)
    {
        _index = index;
        _blockManager = blockManager;
        _lockManager = lockManager;
        _config = config.Value;
        _logger = logger;
    }

    /// <summary>
    /// Checks total cache usage and evicts least recently used chunks until cache is below limit.
    /// Returns the number of bytes evicted.
    /// </summary>
    public async Task<long> EnforceLimitAsync(CancellationToken cancellationToken = default)
    {
        if (_config.MaximumCacheSizeBytes <= 0)
        {
            return 0;
        }

        await _evictionGate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var allMedia = await _index.GetAllMediaMetadataAsync(cancellationToken).ConfigureAwait(false);
            long totalBytes = allMedia.Sum(m => m.TotalCachedBytes);

            if (totalBytes <= _config.MaximumCacheSizeBytes)
            {
                return 0;
            }

            _logger.LogInformation("Cache size ({TotalBytes} bytes) exceeds limit ({Limit} bytes). Starting LRU eviction.",
                totalBytes, _config.MaximumCacheSizeBytes);

            // Collect all candidate chunks across all media files
            var candidates = new List<(string MediaId, long ChunkIndex, long SizeBytes, DateTime LastAccessed)>();
            foreach (var media in allMedia)
            {
                foreach (var (chunkIndex, chunkRecord) in media.Chunks)
                {
                    candidates.Add((media.MediaId, chunkIndex, chunkRecord.SizeBytes, chunkRecord.LastAccessedAtUtc));
                }
            }

            // Order by LRU (oldest access first)
            var sortedCandidates = candidates.OrderBy(c => c.LastAccessed).ToList();
            long evictedBytes = 0;

            foreach (var candidate in sortedCandidates)
            {
                if (totalBytes - evictedBytes <= _config.MaximumCacheSizeBytes)
                {
                    break;
                }

                // Never evict chunks currently being downloaded or read
                if (_lockManager.IsChunkInUse(candidate.MediaId, candidate.ChunkIndex))
                {
                    _logger.LogDebug("Skipping active chunk {ChunkIndex} of media {MediaId} during eviction.",
                        candidate.ChunkIndex, candidate.MediaId);
                    continue;
                }

                bool deleted = _blockManager.DeleteChunk(candidate.MediaId, candidate.ChunkIndex);
                if (deleted)
                {
                    await _index.RemoveChunkRecordAsync(candidate.MediaId, candidate.ChunkIndex, cancellationToken).ConfigureAwait(false);
                    evictedBytes += candidate.SizeBytes;
                    _logger.LogInformation("Evicted LRU chunk {ChunkIndex} for media {MediaId} ({Bytes} bytes).",
                        candidate.ChunkIndex, candidate.MediaId, candidate.SizeBytes);
                }
            }

            _logger.LogInformation("LRU eviction completed. Freed {EvictedBytes} bytes.", evictedBytes);
            return evictedBytes;
        }
        finally
        {
            _evictionGate.Release();
        }
    }

    public void Dispose()
    {
        _evictionGate.Dispose();
    }
}
