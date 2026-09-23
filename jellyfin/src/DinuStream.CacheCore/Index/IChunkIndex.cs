using DinuStream.CacheCore.Model;

namespace DinuStream.CacheCore.Index;

/// <summary>
/// Abstraction for persistent index tracking cached media and their chunks.
/// </summary>
public interface IChunkIndex
{
    Task<MediaCacheMetadata?> GetMetadataAsync(string mediaId, CancellationToken cancellationToken = default);

    Task SaveMetadataAsync(MediaCacheMetadata metadata, CancellationToken cancellationToken = default);

    Task RecordChunkCachedAsync(
        string mediaId,
        string googleDriveFileId,
        long totalFileSize,
        long chunkSize,
        long chunkIndex,
        long sizeBytes,
        string? checksum = null,
        CancellationToken cancellationToken = default);

    Task TouchChunkAsync(string mediaId, long chunkIndex, CancellationToken cancellationToken = default);

    Task RemoveChunkRecordAsync(string mediaId, long chunkIndex, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MediaCacheMetadata>> GetAllMediaMetadataAsync(CancellationToken cancellationToken = default);
}
