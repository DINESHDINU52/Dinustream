using System.Text.Json.Serialization;

namespace DinuStream.CacheCore.Model;

/// <summary>
/// Information about a single cached chunk stored on SSD.
/// </summary>
public sealed class ChunkRecord
{
    [JsonPropertyName("chunkIndex")]
    public long ChunkIndex { get; set; }

    [JsonPropertyName("sizeBytes")]
    public long SizeBytes { get; set; }

    [JsonPropertyName("createdAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("lastAccessedAtUtc")]
    public DateTime LastAccessedAtUtc { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("checksumSha256")]
    public string? ChecksumSha256 { get; set; }
}

/// <summary>
/// Metadata index for a cached media file.
/// </summary>
public sealed class MediaCacheMetadata
{
    [JsonPropertyName("mediaId")]
    public string MediaId { get; set; } = string.Empty;

    [JsonPropertyName("googleDriveFileId")]
    public string GoogleDriveFileId { get; set; } = string.Empty;

    [JsonPropertyName("totalFileSize")]
    public long TotalFileSize { get; set; }

    [JsonPropertyName("chunkSize")]
    public long ChunkSize { get; set; }

    [JsonPropertyName("cacheVersion")]
    public int CacheVersion { get; set; } = 1;

    [JsonPropertyName("createdAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("lastAccessedAtUtc")]
    public DateTime LastAccessedAtUtc { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("chunks")]
    public Dictionary<long, ChunkRecord> Chunks { get; set; } = new();

    /// <summary>
    /// Gets total cached size in bytes for this media.
    /// </summary>
    [JsonIgnore]
    public long TotalCachedBytes => Chunks.Values.Sum(c => c.SizeBytes);

    /// <summary>
    /// Checks if a specific chunk index is recorded as cached.
    /// </summary>
    public bool HasChunk(long chunkIndex) => Chunks.ContainsKey(chunkIndex);
}
