using DinuStream.CacheCore.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore.Storage;

/// <summary>
/// Manages physical storage of chunk binary files on local SSD storage.
/// </summary>
public sealed class SsdBlockManager
{
    private readonly CacheConfiguration _config;
    private readonly ILogger<SsdBlockManager> _logger;

    public SsdBlockManager(IOptions<CacheConfiguration> config, ILogger<SsdBlockManager> logger)
    {
        _config = config.Value;
        _logger = logger;
    }

    /// <summary>
    /// Gets the target directory path for a specific media cache.
    /// </summary>
    public string GetMediaDirectory(string mediaId)
    {
        return Path.Combine(_config.CachePath, mediaId);
    }

    /// <summary>
    /// Gets the file path for a specific chunk binary file (e.g. chunk_000000.bin).
    /// </summary>
    public string GetChunkFilePath(string mediaId, long chunkIndex)
    {
        return Path.Combine(GetMediaDirectory(mediaId), $"chunk_{chunkIndex:D6}.bin");
    }

    /// <summary>
    /// Determines whether the chunk file exists on SSD storage and has non-zero size.
    /// </summary>
    public bool ChunkExists(string mediaId, long chunkIndex)
    {
        var path = GetChunkFilePath(mediaId, chunkIndex);
        var fileInfo = new FileInfo(path);
        return fileInfo.Exists && fileInfo.Length > 0;
    }

    /// <summary>
    /// Gets the length of a cached chunk file in bytes, or 0 if missing.
    /// </summary>
    public long GetChunkLength(string mediaId, long chunkIndex)
    {
        var path = GetChunkFilePath(mediaId, chunkIndex);
        var fileInfo = new FileInfo(path);
        return fileInfo.Exists ? fileInfo.Length : 0;
    }

    /// <summary>
    /// Reads chunk bytes from SSD storage.
    /// </summary>
    public async Task<byte[]> ReadChunkAsync(string mediaId, long chunkIndex, CancellationToken cancellationToken = default)
    {
        var path = GetChunkFilePath(mediaId, chunkIndex);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Chunk file not found: {path}");
        }

        return await File.ReadAllBytesAsync(path, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Atomically writes chunk bytes to SSD storage via a temp file.
    /// </summary>
    public async Task WriteChunkAsync(string mediaId, long chunkIndex, byte[] data, CancellationToken cancellationToken = default)
    {
        var dir = GetMediaDirectory(mediaId);
        if (!Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var targetPath = GetChunkFilePath(mediaId, chunkIndex);
        var tempPath = targetPath + $".{Guid.NewGuid():N}.tmp";

        try
        {
            await File.WriteAllBytesAsync(tempPath, data, cancellationToken).ConfigureAwait(false);
            File.Move(tempPath, targetPath, overwrite: true);
            _logger.LogDebug("Wrote chunk {ChunkIndex} for media {MediaId} ({Bytes} bytes)", chunkIndex, mediaId, data.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write chunk {ChunkIndex} for media {MediaId}", chunkIndex, mediaId);
            if (File.Exists(tempPath))
            {
                try { File.Delete(tempPath); } catch { }
            }
            throw;
        }
    }

    /// <summary>
    /// Deletes a cached chunk file from SSD storage.
    /// </summary>
    public bool DeleteChunk(string mediaId, long chunkIndex)
    {
        var path = GetChunkFilePath(mediaId, chunkIndex);
        if (File.Exists(path))
        {
            try
            {
                File.Delete(path);
                _logger.LogDebug("Deleted chunk {ChunkIndex} for media {MediaId}", chunkIndex, mediaId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error deleting chunk file {Path}", path);
                return false;
            }
        }

        return false;
    }

    /// <summary>
    /// Deletes entire media cache directory from SSD storage.
    /// </summary>
    public void DeleteMediaDirectory(string mediaId)
    {
        var dir = GetMediaDirectory(mediaId);
        if (Directory.Exists(dir))
        {
            try
            {
                Directory.Delete(dir, recursive: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error deleting media cache directory {Dir}", dir);
            }
        }
    }
}
