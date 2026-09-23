namespace DinuStream.CacheCore.Model;

/// <summary>
/// Helper mathematical calculations for chunk partitioning.
/// </summary>
public static class ChunkCalculation
{
    /// <summary>
    /// Computes the total number of chunks for a given file size and chunk size.
    /// </summary>
    public static long GetTotalChunks(long totalFileSize, long chunkSize)
    {
        if (totalFileSize <= 0 || chunkSize <= 0)
        {
            return 0;
        }

        return (totalFileSize + chunkSize - 1) / chunkSize;
    }

    /// <summary>
    /// Gets the chunk index that contains the given byte offset.
    /// </summary>
    public static long GetChunkIndexForByte(long byteOffset, long chunkSize)
    {
        if (chunkSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(chunkSize), "Chunk size must be positive.");
        }

        if (byteOffset < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(byteOffset), "Byte offset must be non-negative.");
        }

        return byteOffset / chunkSize;
    }

    /// <summary>
    /// Calculates the inclusive byte range [startByte, endByte] and length for a specific chunk.
    /// </summary>
    public static (long StartByte, long EndByte, long Length) GetChunkRange(long chunkIndex, long chunkSize, long totalFileSize)
    {
        if (chunkIndex < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(chunkIndex), "Chunk index must be non-negative.");
        }

        long start = chunkIndex * chunkSize;
        if (start >= totalFileSize)
        {
            return (start, start, 0);
        }

        long end = Math.Min(start + chunkSize - 1, totalFileSize - 1);
        long length = end - start + 1;
        return (start, end, length);
    }
}
