using System;
using System.IO;

namespace DinuStream.CacheCore.Configuration;

/// <summary>
/// Configuration settings for the DinuStream SSD Cache layer.
/// All values are fully configurable without hardcoded paths or sizes.
/// </summary>
public class CacheConfiguration
{
    /// <summary>
    /// Whether the SSD cache layer is active. Defaults to true.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Local filesystem path on SSD/NVMe where chunks and metadata are stored.
    /// Cross-platform default adapts to Windows vs Linux.
    /// </summary>
    public string CachePath { get; set; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "DinuStreamCache");

    /// <summary>
    /// Maximum cache directory size in bytes. Default: 100 GB.
    /// </summary>
    public long MaximumCacheSizeBytes { get; set; } = 100L * 1024 * 1024 * 1024;

    /// <summary>
    /// Size of each discrete cached block in bytes. Default: 32 MB.
    /// </summary>
    public int ChunkSizeBytes { get; set; } = 32 * 1024 * 1024;

    /// <summary>
    /// Whether background look-ahead prefetching is enabled. Defaults to true.
    /// </summary>
    public bool PrefetchEnabled { get; set; } = true;

    /// <summary>
    /// Number of sequential chunks to prefetch ahead of the active read position.
    /// E.g., 5 chunks of 32MB = 160 MB (approx 10 minutes of a 20 Mbps 4K stream).
    /// </summary>
    public int PrefetchChunksAhead { get; set; } = 5;

    /// <summary>
    /// Time window ahead to prefetch when media bitrate is known. Default: 10 minutes.
    /// </summary>
    public TimeSpan PrefetchDuration { get; set; } = TimeSpan.FromMinutes(10);

    /// <summary>
    /// How long unused chunk files remain on SSD before becoming eligible for eviction.
    /// Default: 7 days.
    /// </summary>
    public TimeSpan CacheRetention { get; set; } = TimeSpan.FromDays(7);

    /// <summary>
    /// Whether LRU disk space cleanup runs automatically. Defaults to true.
    /// </summary>
    public bool EnableAutomaticCleanup { get; set; } = true;

    /// <summary>
    /// Fraction of MaximumCacheSizeBytes at which eviction triggers. Default: 0.85 (85%).
    /// </summary>
    public double HighWatermarkPercent { get; set; } = 0.85;

    /// <summary>
    /// Target fraction of MaximumCacheSizeBytes after eviction finishes. Default: 0.70 (70%).
    /// </summary>
    public double LowWatermarkPercent { get; set; } = 0.70;

    /// <summary>
    /// Minimum remote file size eligible for range-based chunking. Smaller files can be direct-cached.
    /// Default: 50 MB.
    /// </summary>
    public long MinimumChunkingFileSizeBytes { get; set; } = 50L * 1024 * 1024;

    /// <summary>
    /// Optional Google Drive specific configuration (OAuth, Service Account, or Proxy).
    /// </summary>
    public GoogleDriveOptions GoogleDrive { get; set; } = new();
}

public class GoogleDriveOptions
{
    public bool Enabled { get; set; } = true;
    public string ServiceAccountKeyPath { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string RootFolderId { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 60;
    public int MaxRetryAttempts { get; set; } = 3;
}
