using System.Collections.Concurrent;

namespace DinuStream.CacheCore.Storage;

/// <summary>
/// In-memory mock implementation of IGoogleDriveStorage for unit tests and local simulation.
/// Can simulate very large files (e.g. 10 GB) with deterministic byte patterns without holding 10 GB in RAM.
/// </summary>
public sealed class MockGoogleDriveStorage : IGoogleDriveStorage
{
    private readonly ConcurrentDictionary<string, MockFileInfo> _files = new();
    private int _downloadCallCount;
    private int _readRangeCallCount;
    private bool _shouldFailNextDownload;
    private Exception? _customFailureException;

    public int DownloadCallCount => _downloadCallCount;
    public int ReadRangeCallCount => _readRangeCallCount;

    public void RegisterFile(string fileId, string name, long totalSize, byte[]? explicitContent = null)
    {
        _files[fileId] = new MockFileInfo(fileId, name, totalSize, explicitContent);
    }

    public void SetShouldFailNextDownload(bool fail, Exception? exception = null)
    {
        _shouldFailNextDownload = fail;
        _customFailureException = exception ?? new HttpRequestException("Simulated Google Drive network timeout");
    }

    public void ResetCallCounts()
    {
        Interlocked.Exchange(ref _downloadCallCount, 0);
        Interlocked.Exchange(ref _readRangeCallCount, 0);
    }

    public Task<RemoteFileMetadata?> GetFileMetadataAsync(string fileIdOrPath, CancellationToken cancellationToken = default)
    {
        if (!_files.TryGetValue(fileIdOrPath, out var info))
        {
            return Task.FromResult<RemoteFileMetadata?>(null);
        }

        return Task.FromResult<RemoteFileMetadata?>(new RemoteFileMetadata(
            FileId: info.FileId,
            Name: info.Name,
            TotalSizeBytes: info.SizeBytes,
            MimeType: "video/mp4",
            LastModifiedUtc: DateTime.UtcNow));
    }

    public Task<bool> FileExistsAsync(string fileIdOrPath, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_files.ContainsKey(fileIdOrPath));
    }

    public async Task<Stream> ReadRangeStreamAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default)
    {
        var bytes = await DownloadChunkAsync(fileIdOrPath, startByte, endByte, cancellationToken).ConfigureAwait(false);
        return new MemoryStream(bytes);
    }

    public Task<byte[]> DownloadChunkAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default)
    {
        Interlocked.Increment(ref _downloadCallCount);

        if (_shouldFailNextDownload)
        {
            _shouldFailNextDownload = false;
            throw _customFailureException ?? new HttpRequestException("Simulated Google Drive chunk download failure");
        }

        if (!_files.TryGetValue(fileIdOrPath, out var info))
        {
            throw new FileNotFoundException($"File not found in Mock Google Drive: {fileIdOrPath}");
        }

        long length = endByte - startByte + 1;
        if (length <= 0)
        {
            return Task.FromResult(Array.Empty<byte>());
        }

        var buffer = new byte[length];

        if (info.ExplicitContent != null)
        {
            long copyLen = Math.Min(length, info.ExplicitContent.Length - startByte);
            if (copyLen > 0)
            {
                Array.Copy(info.ExplicitContent, startByte, buffer, 0, copyLen);
            }
        }
        else
        {
            // Deterministic pattern: generate reproducible bytes based on position
            for (long i = 0; i < length; i++)
            {
                buffer[i] = (byte)((startByte + i) % 256);
            }
        }

        return Task.FromResult(buffer);
    }

    private sealed record MockFileInfo(string FileId, string Name, long SizeBytes, byte[]? ExplicitContent);
}
