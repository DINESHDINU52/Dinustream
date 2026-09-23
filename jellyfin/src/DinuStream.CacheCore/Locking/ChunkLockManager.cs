using System.Collections.Concurrent;

namespace DinuStream.CacheCore.Locking;

/// <summary>
/// Coordinates concurrent chunk accesses to ensure single-flight downloads and prevent evicting active chunks.
/// </summary>
public sealed class ChunkLockManager
{
    // Tracks in-flight download operations: Key is (MediaId, ChunkIndex)
    private readonly ConcurrentDictionary<(string MediaId, long ChunkIndex), Task<byte[]>> _inFlightDownloads = new();

    // Tracks active read references so LRU eviction never deletes a chunk actively being read
    private readonly ConcurrentDictionary<(string MediaId, long ChunkIndex), int> _activeReaders = new();

    /// <summary>
    /// Executes a download operation using single-flight deduplication.
    /// If multiple callers invoke this concurrently for the same chunk, only one actual factory invocation runs.
    /// In case of error, the in-flight entry is cleanly removed so future requests can retry.
    /// </summary>
    public async Task<byte[]> ExecuteSingleFlightAsync(
        string mediaId,
        long chunkIndex,
        Func<Task<byte[]>> downloadFactory,
        CancellationToken cancellationToken = default)
    {
        var key = (mediaId, chunkIndex);

        while (true)
        {
            var taskSource = new TaskCompletionSource<byte[]>(TaskCreationOptions.RunContinuationsAsynchronously);

            if (_inFlightDownloads.TryAdd(key, taskSource.Task))
            {
                // Current caller won the race and will execute the download
                try
                {
                    var result = await downloadFactory().ConfigureAwait(false);
                    taskSource.TrySetResult(result);
                    return result;
                }
                catch (Exception ex)
                {
                    taskSource.TrySetException(ex);
                    throw;
                }
                finally
                {
                    _inFlightDownloads.TryRemove(key, out _);
                }
            }

            // Another caller is already downloading this chunk, await their task
            if (_inFlightDownloads.TryGetValue(key, out var existingTask))
            {
                using var registration = cancellationToken.Register(() => { });
                try
                {
                    return await existingTask.WaitAsync(cancellationToken).ConfigureAwait(false);
                }
                catch when (!cancellationToken.IsCancellationRequested)
                {
                    // The other caller failed, wait a tiny bit and retry or return error
                    throw;
                }
            }
        }
    }

    /// <summary>
    /// Increments the active reader count for a chunk.
    /// </summary>
    public IDisposable AcquireReadLock(string mediaId, long chunkIndex)
    {
        var key = (mediaId, chunkIndex);
        _activeReaders.AddOrUpdate(key, 1, (_, count) => count + 1);
        return new ReadLockReleaser(this, key);
    }

    /// <summary>
    /// Determines if a chunk is currently being downloaded or read.
    /// </summary>
    public bool IsChunkInUse(string mediaId, long chunkIndex)
    {
        var key = (mediaId, chunkIndex);
        if (_inFlightDownloads.ContainsKey(key))
        {
            return true;
        }

        return _activeReaders.TryGetValue(key, out var count) && count > 0;
    }

    private void ReleaseReadLock((string MediaId, long ChunkIndex) key)
    {
        _activeReaders.AddOrUpdate(key, 0, (_, count) => Math.Max(0, count - 1));
    }

    private sealed class ReadLockReleaser : IDisposable
    {
        private readonly ChunkLockManager _manager;
        private readonly (string MediaId, long ChunkIndex) _key;
        private bool _disposed;

        public ReadLockReleaser(ChunkLockManager manager, (string MediaId, long ChunkIndex) key)
        {
            _manager = manager;
            _key = key;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _manager.ReleaseReadLock(_key);
            }
        }
    }
}
