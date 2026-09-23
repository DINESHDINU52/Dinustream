namespace DinuStream.CacheCore.Storage;

/// <summary>
/// Remote file metadata retrieved from Google Drive.
/// </summary>
public sealed record RemoteFileMetadata(
    string FileId,
    string Name,
    long TotalSizeBytes,
    string MimeType,
    DateTime LastModifiedUtc
);

/// <summary>
/// Clean abstraction for remote Google Drive byte-range operations.
/// Completely decoupled from specific HTTP client or SDK implementation details.
/// </summary>
public interface IGoogleDriveStorage
{
    /// <summary>
    /// Retrieves file metadata including total size in bytes.
    /// </summary>
    Task<RemoteFileMetadata?> GetFileMetadataAsync(string fileIdOrPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads an exact byte range from Google Drive via HTTP Range request (e.g. bytes=0-33554431) as a Stream.
    /// </summary>
    Task<Stream> ReadRangeStreamAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default);

    /// <summary>
    /// Downloads an exact chunk range directly into a memory buffer.
    /// </summary>
    Task<byte[]> DownloadChunkAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether the media file exists on Google Drive.
    /// </summary>
    Task<bool> FileExistsAsync(string fileIdOrPath, CancellationToken cancellationToken = default);
}
