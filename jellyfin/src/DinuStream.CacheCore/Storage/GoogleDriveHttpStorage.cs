using System.Net.Http.Headers;
using System.Text.Json;
using DinuStream.CacheCore.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DinuStream.CacheCore.Storage;

/// <summary>
/// Production HTTP client for Google Drive API supporting byte-range chunk downloads.
/// </summary>
public sealed class GoogleDriveHttpStorage : IGoogleDriveStorage
{
    private readonly HttpClient _httpClient;
    private readonly CacheConfiguration _config;
    private readonly ILogger<GoogleDriveHttpStorage> _logger;

    public GoogleDriveHttpStorage(HttpClient httpClient, IOptions<CacheConfiguration> config, ILogger<GoogleDriveHttpStorage> logger)
    {
        _httpClient = httpClient;
        _config = config.Value;
        _logger = logger;
    }

    public async Task<RemoteFileMetadata?> GetFileMetadataAsync(string fileIdOrPath, CancellationToken cancellationToken = default)
    {
        var url = $"https://www.googleapis.com/drive/v3/files/{fileIdOrPath}?fields=id,name,size,mimeType,modifiedTime";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        ApplyAuth(request);

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken).ConfigureAwait(false);
        var root = doc.RootElement;

        var id = root.GetProperty("id").GetString() ?? fileIdOrPath;
        var name = root.GetProperty("name").GetString() ?? "unknown";
        var sizeStr = root.TryGetProperty("size", out var sizeProp) ? sizeProp.GetString() : "0";
        _ = long.TryParse(sizeStr, out var sizeBytes);
        var mimeType = root.TryGetProperty("mimeType", out var mimeProp) ? mimeProp.GetString() ?? "application/octet-stream" : "application/octet-stream";
        var modifiedStr = root.TryGetProperty("modifiedTime", out var modProp) ? modProp.GetString() : null;
        _ = DateTime.TryParse(modifiedStr, out var modified);

        return new RemoteFileMetadata(id, name, sizeBytes, mimeType, modified);
    }

    public async Task<bool> FileExistsAsync(string fileIdOrPath, CancellationToken cancellationToken = default)
    {
        try
        {
            var meta = await GetFileMetadataAsync(fileIdOrPath, cancellationToken).ConfigureAwait(false);
            return meta != null && meta.TotalSizeBytes > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to verify existence of Google Drive file {FileId}", fileIdOrPath);
            return false;
        }
    }

    public async Task<Stream> ReadRangeStreamAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default)
    {
        var url = $"https://www.googleapis.com/drive/v3/files/{fileIdOrPath}?alt=media";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        ApplyAuth(request);

        request.Headers.Range = new RangeHeaderValue(startByte, endByte);

        var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<byte[]> DownloadChunkAsync(string fileIdOrPath, long startByte, long endByte, CancellationToken cancellationToken = default)
    {
        var url = $"https://www.googleapis.com/drive/v3/files/{fileIdOrPath}?alt=media";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        ApplyAuth(request);

        request.Headers.Range = new RangeHeaderValue(startByte, endByte);

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync(cancellationToken).ConfigureAwait(false);
    }

    private void ApplyAuth(HttpRequestMessage request)
    {
        if (!string.IsNullOrWhiteSpace(_config.GoogleDrive.AccessToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.GoogleDrive.AccessToken);
        }
    }
}
