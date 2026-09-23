namespace DinuStream.CacheCore.Streams;

/// <summary>
/// A seekable, readable stream over chunked cached media.
/// Enables random access playback without downloading the whole file upfront.
/// </summary>
public sealed class DinuStreamChunkedStream : Stream
{
    private readonly CacheManager _cacheManager;
    private readonly string _mediaId;
    private readonly string _googleDriveFileId;
    private readonly long _totalLength;
    private readonly long? _bitrate;
    private long _position;

    public DinuStreamChunkedStream(
        CacheManager cacheManager,
        string mediaId,
        string googleDriveFileId,
        long totalLength,
        long? bitrate = null)
    {
        _cacheManager = cacheManager;
        _mediaId = mediaId;
        _googleDriveFileId = googleDriveFileId;
        _totalLength = totalLength;
        _bitrate = bitrate;
        _position = 0;
    }

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => _totalLength;

    public override long Position
    {
        get => _position;
        set
        {
            if (value < 0 || value > _totalLength)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Position must be within stream bounds.");
            }
            _position = value;
        }
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        return ReadAsync(buffer, offset, count, CancellationToken.None).GetAwaiter().GetResult();
    }

    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        if (_position >= _totalLength || count <= 0)
        {
            return 0;
        }

        int bytesRead = await _cacheManager.ReadRangeAsync(
            _mediaId,
            _googleDriveFileId,
            _position,
            buffer,
            offset,
            count,
            _totalLength,
            cancellationToken).ConfigureAwait(false);

        _position += bytesRead;
        return bytesRead;
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        var array = new byte[buffer.Length];
        int read = await ReadAsync(array, 0, array.Length, cancellationToken).ConfigureAwait(false);
        if (read > 0)
        {
            array.AsMemory(0, read).CopyTo(buffer);
        }
        return read;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        long targetPosition = origin switch
        {
            SeekOrigin.Begin => offset,
            SeekOrigin.Current => _position + offset,
            SeekOrigin.End => _totalLength + offset,
            _ => throw new ArgumentOutOfRangeException(nameof(origin))
        };

        if (targetPosition < 0 || targetPosition > _totalLength)
        {
            throw new IOException($"Seek out of bounds: target {targetPosition}, length {_totalLength}");
        }

        _position = targetPosition;
        return _position;
    }

    public override void Flush() { }

    public override void SetLength(long value) => throw new NotSupportedException("DinuStreamChunkedStream is read-only.");

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException("DinuStreamChunkedStream is read-only.");
}
