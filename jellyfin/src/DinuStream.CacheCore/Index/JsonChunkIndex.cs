using System.Collections.Concurrent;
using System.Text.Json;
using DinuStream.CacheCore.Configuration;
using DinuStream.CacheCore.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore.Index;

/// <summary>
/// Lightweight JSON-based persistent index storing metadata.json alongside cached chunks.
/// Uses an in-memory concurrent cache backed by on-disk metadata.json for ultra-fast lookups.
/// </summary>
public sealed class JsonChunkIndex : IChunkIndex
{
    private readonly CacheConfiguration _config;
    private readonly ILogger<JsonChunkIndex> _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _mediaLocks = new();
    private readonly ConcurrentDictionary<string, MediaCacheMetadata> _metadataCache = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    public JsonChunkIndex(IOptions<CacheConfiguration> config, ILogger<JsonChunkIndex> logger)
    {
        _config = config.Value;
        _logger = logger;
    }

    private string GetMetadataPath(string mediaId)
    {
        var dir = Path.Combine(_config.CachePath, mediaId);
        return Path.Combine(dir, "metadata.json");
    }

    private SemaphoreSlim GetLock(string mediaId)
    {
        return _mediaLocks.GetOrAdd(mediaId, _ => new SemaphoreSlim(1, 1));
    }

    public async Task<MediaCacheMetadata?> GetMetadataAsync(string mediaId, CancellationToken cancellationToken = default)
    {
        if (_metadataCache.TryGetValue(mediaId, out var cached))
        {
            return cached;
        }

        var filePath = GetMetadataPath(mediaId);
        if (!File.Exists(filePath))
        {
            return null;
        }

        var gate = GetLock(mediaId);
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_metadataCache.TryGetValue(mediaId, out cached))
            {
                return cached;
            }

            await using var stream = File.OpenRead(filePath);
            var loaded = await JsonSerializer.DeserializeAsync<MediaCacheMetadata>(stream, JsonOptions, cancellationToken).ConfigureAwait(false);
            if (loaded != null)
            {
                _metadataCache[mediaId] = loaded;
            }
            return loaded;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read cache metadata for media {MediaId}", mediaId);
            return null;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task SaveMetadataAsync(MediaCacheMetadata metadata, CancellationToken cancellationToken = default)
    {
        _metadataCache[metadata.MediaId] = metadata;

        var filePath = GetMetadataPath(metadata.MediaId);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var gate = GetLock(metadata.MediaId);
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var tempPath = filePath + ".tmp";
            await using (var stream = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(stream, metadata, JsonOptions, cancellationToken).ConfigureAwait(false);
            }

            File.Move(tempPath, filePath, overwrite: true);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task RecordChunkCachedAsync(
        string mediaId,
        string googleDriveFileId,
        long totalFileSize,
        long chunkSize,
        long chunkIndex,
        long sizeBytes,
        string? checksum = null,
        CancellationToken cancellationToken = default)
    {
        var gate = GetLock(mediaId);
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var metadata = await GetMetadataInternalAsync(mediaId, cancellationToken).ConfigureAwait(false);
            if (metadata == null)
            {
                metadata = new MediaCacheMetadata
                {
                    MediaId = mediaId,
                    GoogleDriveFileId = googleDriveFileId,
                    TotalFileSize = totalFileSize,
                    ChunkSize = chunkSize,
                    CreatedAtUtc = DateTime.UtcNow,
                    LastAccessedAtUtc = DateTime.UtcNow
                };
            }

            metadata.LastAccessedAtUtc = DateTime.UtcNow;
            metadata.Chunks[chunkIndex] = new ChunkRecord
            {
                ChunkIndex = chunkIndex,
                SizeBytes = sizeBytes,
                CreatedAtUtc = DateTime.UtcNow,
                LastAccessedAtUtc = DateTime.UtcNow,
                ChecksumSha256 = checksum
            };

            _metadataCache[mediaId] = metadata;
            await SaveMetadataInternalAsync(metadata, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task TouchChunkAsync(string mediaId, long chunkIndex, CancellationToken cancellationToken = default)
    {
        var gate = GetLock(mediaId);
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var metadata = await GetMetadataInternalAsync(mediaId, cancellationToken).ConfigureAwait(false);
            if (metadata != null && metadata.Chunks.TryGetValue(chunkIndex, out var chunk))
            {
                var now = DateTime.UtcNow;
                chunk.LastAccessedAtUtc = now;
                metadata.LastAccessedAtUtc = now;
                await SaveMetadataInternalAsync(metadata, cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task RemoveChunkRecordAsync(string mediaId, long chunkIndex, CancellationToken cancellationToken = default)
    {
        var gate = GetLock(mediaId);
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var metadata = await GetMetadataInternalAsync(mediaId, cancellationToken).ConfigureAwait(false);
            if (metadata != null && metadata.Chunks.Remove(chunkIndex))
            {
                metadata.LastAccessedAtUtc = DateTime.UtcNow;
                await SaveMetadataInternalAsync(metadata, cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<IReadOnlyList<MediaCacheMetadata>> GetAllMediaMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (Directory.Exists(_config.CachePath))
        {
            foreach (var dir in Directory.GetDirectories(_config.CachePath))
            {
                var mediaId = Path.GetFileName(dir);
                if (!_metadataCache.ContainsKey(mediaId))
                {
                    await GetMetadataAsync(mediaId, cancellationToken).ConfigureAwait(false);
                }
            }
        }

        return _metadataCache.Values.ToList();
    }

    private async Task<MediaCacheMetadata?> GetMetadataInternalAsync(string mediaId, CancellationToken cancellationToken)
    {
        if (_metadataCache.TryGetValue(mediaId, out var cached))
        {
            return cached;
        }

        var filePath = GetMetadataPath(mediaId);
        if (!File.Exists(filePath))
        {
            return null;
        }

        await using var stream = File.OpenRead(filePath);
        var meta = await JsonSerializer.DeserializeAsync<MediaCacheMetadata>(stream, JsonOptions, cancellationToken).ConfigureAwait(false);
        if (meta != null)
        {
            _metadataCache[mediaId] = meta;
        }
        return meta;
    }

    private async Task SaveMetadataInternalAsync(MediaCacheMetadata metadata, CancellationToken cancellationToken)
    {
        var filePath = GetMetadataPath(metadata.MediaId);
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var tempPath = filePath + ".tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, metadata, JsonOptions, cancellationToken).ConfigureAwait(false);
        }

        File.Move(tempPath, filePath, overwrite: true);
    }
}
