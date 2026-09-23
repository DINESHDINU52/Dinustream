using DinuStream.CacheCore;
using DinuStream.CacheCore.Configuration;
using DinuStream.CacheCore.Eviction;
using DinuStream.CacheCore.Index;
using DinuStream.CacheCore.Locking;
using DinuStream.CacheCore.Model;
using DinuStream.CacheCore.Prefetch;
using DinuStream.CacheCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DinuStream.CacheCore.Tests;

public sealed class CacheCoreTests : IDisposable
{
    private readonly string _testCachePath;

    public CacheCoreTests()
    {
        _testCachePath = Path.Combine(Path.GetTempPath(), "DinuStreamCacheTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testCachePath);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testCachePath))
        {
            try { Directory.Delete(_testCachePath, recursive: true); } catch { }
        }
    }

    private (CacheManager Manager, MockGoogleDriveStorage MockDrive, SsdBlockManager BlockManager, IChunkIndex Index, CacheEvictionManager Eviction)
        CreateTestHarness(int chunkSize = 1024, long maxCacheSize = 10 * 1024, int lookahead = 2, bool enableAutomaticCleanup = true)
    {
        var config = new CacheConfiguration
        {
            Enabled = true,
            CachePath = _testCachePath,
            ChunkSizeBytes = chunkSize,
            MaximumCacheSizeBytes = maxCacheSize,
            PrefetchEnabled = lookahead > 0,
            PrefetchChunksAhead = lookahead,
            EnableAutomaticCleanup = enableAutomaticCleanup
        };

        var options = Options.Create(config);
        var mockDrive = new MockGoogleDriveStorage();
        var blockManager = new SsdBlockManager(options, NullLogger<SsdBlockManager>.Instance);
        var index = new JsonChunkIndex(options, NullLogger<JsonChunkIndex>.Instance);
        var lockManager = new ChunkLockManager();
        var eviction = new CacheEvictionManager(index, blockManager, lockManager, options, NullLogger<CacheEvictionManager>.Instance);
        var prefetch = new PrefetchCoordinator(options, NullLogger<PrefetchCoordinator>.Instance);
        var manager = new CacheManager(
            options,
            mockDrive,
            blockManager,
            index,
            lockManager,
            eviction,
            prefetch,
            NullLogger<CacheManager>.Instance);

        return (manager, mockDrive, blockManager, index, eviction);
    }

    [Fact]
    public void Chunking_10GB_File_ComputesCorrectChunkCountAndOffsets()
    {
        long tenGb = 10L * 1024 * 1024 * 1024; // 10,737,418,240 bytes
        long chunkSize = 32 * 1024 * 1024;     // 33,554,432 bytes

        long totalChunks = ChunkCalculation.GetTotalChunks(tenGb, chunkSize);
        Assert.Equal(320, totalChunks);

        // Chunk 0: 0 to 33,554,431 (32 MB)
        var (c0Start, c0End, c0Len) = ChunkCalculation.GetChunkRange(0, chunkSize, tenGb);
        Assert.Equal(0, c0Start);
        Assert.Equal(33554431, c0End);
        Assert.Equal(33554432, c0Len);

        // Chunk 1: 33,554,432 to 67,108,863
        var (c1Start, c1End, c1Len) = ChunkCalculation.GetChunkRange(1, chunkSize, tenGb);
        Assert.Equal(33554432, c1Start);
        Assert.Equal(67108863, c1End);
        Assert.Equal(33554432, c1Len);

        // Last Chunk 319: 10,703,863,808 to 10,737,418,239
        var (cLastStart, cLastEnd, cLastLen) = ChunkCalculation.GetChunkRange(319, chunkSize, tenGb);
        Assert.Equal(10703863808L, cLastStart);
        Assert.Equal(tenGb - 1, cLastEnd);
        Assert.Equal(chunkSize, cLastLen);

        // Test offset mapping
        Assert.Equal(0, ChunkCalculation.GetChunkIndexForByte(0, chunkSize));
        Assert.Equal(0, ChunkCalculation.GetChunkIndexForByte(33554431, chunkSize));
        Assert.Equal(1, ChunkCalculation.GetChunkIndexForByte(33554432, chunkSize));
        Assert.Equal(319, ChunkCalculation.GetChunkIndexForByte(tenGb - 1, chunkSize));
    }

    [Fact]
    public async Task CacheMiss_DownloadsFromGoogleDrive_AndSavesToSsd()
    {
        var (manager, mockDrive, blockManager, index, _) = CreateTestHarness(chunkSize: 1024, lookahead: 0);
        string mediaId = "movie-1";
        string gdriveId = "gdrive-file-1";
        long totalSize = 5000;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        // Initially chunk 0 does not exist on SSD
        Assert.False(blockManager.ChunkExists(mediaId, 0));

        // Request chunk 0 -> cache miss
        var data = await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 0, totalSize);

        Assert.Equal(1024, data.Length);
        Assert.Equal(1, mockDrive.DownloadCallCount);
        Assert.True(blockManager.ChunkExists(mediaId, 0));

        var meta = await index.GetMetadataAsync(mediaId);
        Assert.NotNull(meta);
        Assert.True(meta.HasChunk(0));
    }

    [Fact]
    public async Task CacheHit_ReadsFromSsd_WithoutCallingGoogleDrive()
    {
        var (manager, mockDrive, blockManager, _, _) = CreateTestHarness(chunkSize: 1024);
        string mediaId = "movie-hit";
        string gdriveId = "gdrive-file-hit";
        long totalSize = 5000;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        // Pre-populate chunk 0 directly on SSD
        var preCachedData = new byte[1024];
        Array.Fill(preCachedData, (byte)0x42);
        await blockManager.WriteChunkAsync(mediaId, 0, preCachedData);

        // Fetch chunk 0
        var result = await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 0, totalSize);

        Assert.Equal(preCachedData, result);
        Assert.Equal(0, mockDrive.DownloadCallCount); // Zero Google Drive requests made!
    }

    [Fact]
    public async Task ConcurrentRequests_ThreeUsers_PerformSingleFlightDownload()
    {
        var (manager, mockDrive, _, _, _) = CreateTestHarness(chunkSize: 2048, lookahead: 0);
        string mediaId = "movie-concurrent";
        string gdriveId = "gdrive-file-concurrent";
        long totalSize = 10000;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        // Simulate User A, User B, User C requesting Chunk 1 simultaneously (Chunk 1 is bytes 2048..4095)
        var taskA = Task.Run(() => manager.GetOrFetchChunkAsync(mediaId, gdriveId, 1, totalSize));
        var taskB = Task.Run(() => manager.GetOrFetchChunkAsync(mediaId, gdriveId, 1, totalSize));
        var taskC = Task.Run(() => manager.GetOrFetchChunkAsync(mediaId, gdriveId, 1, totalSize));

        var results = await Task.WhenAll(taskA, taskB, taskC);

        // Exactly ONE download occurred
        Assert.Equal(1, mockDrive.DownloadCallCount);

        // All 3 callers received the same valid chunk of 2048 bytes
        Assert.Equal(2048, results[0].Length);
        Assert.Equal(results[0], results[1]);
        Assert.Equal(results[1], results[2]);
    }

    [Fact]
    public async Task FailedDownload_ReleasesWaitingTasks_AndAllowsRetry()
    {
        var (manager, mockDrive, _, _, _) = CreateTestHarness(chunkSize: 1024);
        string mediaId = "movie-fail";
        string gdriveId = "gdrive-file-fail";
        long totalSize = 5000;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);
        mockDrive.SetShouldFailNextDownload(true);

        // Callers should fail without hanging
        await Assert.ThrowsAsync<HttpRequestException>(async () =>
        {
            await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 2, totalSize);
        });

        // The lock is released: subsequent attempt should be able to download successfully
        var retryData = await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 2, totalSize);
        Assert.Equal(1024, retryData.Length);
    }

    [Fact]
    public async Task Eviction_RemovesLeastRecentlyUsedChunks_WhenLimitExceeded()
    {
        // 3 chunks of 100 bytes each = 300 bytes. Set limit to 250 bytes (max 2 chunks)
        int chunkSize = 100;
        long maxCacheSize = 250;
        var (manager, mockDrive, blockManager, index, eviction) = CreateTestHarness(
            chunkSize: chunkSize,
            maxCacheSize: maxCacheSize,
            lookahead: 0,
            enableAutomaticCleanup: false);

        string mediaId = "movie-evict";
        string gdriveId = "gdrive-file-evict";
        long totalSize = 500;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        // Populate chunk 0
        await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 0, totalSize);
        await Task.Delay(20);

        // Populate chunk 1
        await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 1, totalSize);
        await Task.Delay(20);

        // Populate chunk 2 -> total is now 300 bytes, which exceeds 250 bytes limit
        await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 2, totalSize);

        // Enforce eviction
        long evicted = await eviction.EnforceLimitAsync();

        Assert.True(evicted >= 100, $"Expected at least 100 bytes evicted, but was {evicted}");
        // Chunk 0 was least recently accessed, so it should be evicted
        Assert.False(blockManager.ChunkExists(mediaId, 0));
        // Chunks 1 and 2 were more recently accessed and remain
        Assert.True(blockManager.ChunkExists(mediaId, 2));
    }

    [Fact]
    public async Task Prefetch_BackgroundWorker_FetchesConfiguredUpcomingChunks()
    {
        var (manager, mockDrive, blockManager, _, _) = CreateTestHarness(chunkSize: 1024, lookahead: 3);
        string mediaId = "movie-prefetch";
        string gdriveId = "gdrive-file-prefetch";
        long totalSize = 10 * 1024; // 10 chunks

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        // Request chunk 2
        await manager.GetOrFetchChunkAsync(mediaId, gdriveId, 2, totalSize);

        // Wait brief moment for background prefetch channel to process upcoming chunks 3, 4, 5
        var timeout = DateTime.UtcNow.AddSeconds(5);
        while (DateTime.UtcNow < timeout)
        {
            if (blockManager.ChunkExists(mediaId, 3) && blockManager.ChunkExists(mediaId, 4))
            {
                break;
            }
            await Task.Delay(50);
        }

        Assert.True(blockManager.ChunkExists(mediaId, 3));
        Assert.True(blockManager.ChunkExists(mediaId, 4));
    }

    [Fact]
    public async Task DinuStreamChunkedStream_SeekAndReadAcrossChunkBoundaries()
    {
        var (manager, mockDrive, _, _, _) = CreateTestHarness(chunkSize: 100);
        string mediaId = "movie-stream";
        string gdriveId = "gdrive-file-stream";
        long totalSize = 1000;

        mockDrive.RegisterFile(gdriveId, "movie.mkv", totalSize);

        await using var stream = manager.OpenStream(mediaId, gdriveId, totalSize);
        Assert.Equal(totalSize, stream.Length);
        Assert.Equal(0, stream.Position);

        // Seek across chunk 0 boundary (offset 90, read 30 bytes -> covers chunk 0 [90-99] and chunk 1 [100-119])
        stream.Seek(90, SeekOrigin.Begin);
        Assert.Equal(90, stream.Position);

        var buffer = new byte[30];
        int bytesRead = await stream.ReadAsync(buffer, 0, 30);

        Assert.Equal(30, bytesRead);
        Assert.Equal(120, stream.Position);

        // Verify content matches expected deterministic pattern
        for (int i = 0; i < 30; i++)
        {
            byte expected = (byte)((90 + i) % 256);
            Assert.Equal(expected, buffer[i]);
        }
    }
}
