import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

const ALLOWED_ENDPOINTS = [
  'user-views',
  'items',
  'shows',
  'playback-info',
  'sessions',
  'syncplay',
  'artists',
  'audio',
  'search',
  'videos',
  'system',
];

/**
 * Remove credentials Jellyfin embeds in the playlists it generates.
 *
 * The whole point of this proxy is that the API key never reaches the browser —
 * but Jellyfin writes `ApiKey=<key>` into every URL inside a generated
 * master/variant playlist, so serving the manifest verbatim hands the key to the
 * client in plain text. It is not needed there: the proxy attaches the
 * Authorization header to each segment request server-side.
 *
 * Handled in three passes so no dangling `?` or `&` is left behind, which would
 * otherwise corrupt the query string the segment routes depend on.
 */
function stripEmbeddedCredentials(playlist: string): string {
  return playlist
    .replace(/&(?:ApiKey|api_key)=[^&\s"']*/gi, '')
    .replace(/\?(?:ApiKey|api_key)=[^&\s"']*&/gi, '?')
    .replace(/\?(?:ApiKey|api_key)=[^&\s"']*/gi, '');
}

function getJellyfinConfig() {
  const serverUrl = process.env.JELLYFIN_SERVER_URL || 'http://127.0.0.1:8096';
  const apiKey = process.env.JELLYFIN_API_KEY || '';
  const userId = process.env.JELLYFIN_USER_ID || 'f036d3ab8ad94c9eb8b5945190f3dde7';
  return { serverUrl, apiKey, userId };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const clientIp = getClientIp(req.headers);
    const { path } = await context.params;
    const subPath = path.join('/');

    // Security: Prevent path traversal and malicious characters
    if (subPath.includes('..') || subPath.includes('\\') || subPath.includes('//') || subPath.includes('\0')) {
      return NextResponse.json({ error: 'Malformed path parameter' }, { status: 400 });
    }

    /*
      Classify the request up front.

      This used to be a single `isStream` flag matching any videos path
      containing "/stream", and every such request had `Static=true` forced onto
      it — which pins Jellyfin to direct-play of the original file. That is why
      adaptive streaming was impossible and why MKV/HEVC/TrueHD sources could not
      play in Safari or on iOS at all: the browser was handed a container it
      cannot demux.

      HLS needs three more shapes to pass through untouched:
        - the master and variant playlists (*.m3u8)
        - the media segments (hls1/..., *.ts, *.mp4, *.m4s)
        - sidecar subtitle tracks (.../Subtitles/.../Stream.vtt)
    */
    const isVideoPath = subPath.startsWith('videos/');
    const lowerPath = subPath.toLowerCase();

    const isHlsManifest = isVideoPath && lowerPath.endsWith('.m3u8');
    const isHlsSegment =
      isVideoPath &&
      (lowerPath.includes('/hls1/') ||
        lowerPath.endsWith('.ts') ||
        lowerPath.endsWith('.m4s') ||
        (lowerPath.endsWith('.mp4') && !lowerPath.includes('/stream')));
    const isSubtitle = isVideoPath && lowerPath.includes('/subtitles/');
    const isProgressive = isVideoPath && lowerPath.includes('/stream');

    /** Any binary/text media passthrough: never JSON-parsed, never rate limited. */
    const isMedia = isHlsManifest || isHlsSegment || isSubtitle || isProgressive;

    // Rate limit metadata requests only. A single HLS playback issues one
    // segment request every few seconds, which would burn the budget instantly.
    if (!isMedia) {
      const rateLimit = checkRateLimit(`jellyfin_${clientIp}`, {
        windowMs: 60000,
        maxRequests: 300,
      });

      if (!rateLimit.success) {
        const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Jellyfin proxy rate limit exceeded' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
    }

    const isAllowed = ALLOWED_ENDPOINTS.some(
      (allowed) => subPath === allowed || subPath.startsWith(`${allowed}/`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Forbidden: Access to this Jellyfin subsystem endpoint is restricted.' },
        { status: 403 }
      );
    }

    const { serverUrl, apiKey, userId } = getJellyfinConfig();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Jellyfin integration is not configured (API key missing)' },
        { status: 503 }
      );
    }

    // Map subpaths to Jellyfin REST API
    let jPath = `/${subPath}`;
    let isImage = false;

    if (subPath === 'user-views') {
      jPath = `/Users/${encodeURIComponent(userId)}/Views`;
    } else if (subPath === 'items') {
      jPath = `/Users/${encodeURIComponent(userId)}/Items`;
    } else if (subPath.startsWith('items/') && subPath.includes('/Images/')) {
      // /items/:id/Images/:type
      const parts = subPath.split('/');
      jPath = `/Items/${encodeURIComponent(parts[1])}/Images/${encodeURIComponent(parts[3])}`;
      isImage = true;
    } else if (subPath.startsWith('shows/') && subPath.endsWith('/seasons')) {
      const sId = subPath.split('/')[1];
      jPath = `/Shows/${encodeURIComponent(sId)}/Seasons`;
    } else if (subPath.startsWith('shows/') && subPath.endsWith('/episodes')) {
      const sId = subPath.split('/')[1];
      jPath = `/Shows/${encodeURIComponent(sId)}/Episodes`;
    } else if (subPath.startsWith('items/') && !subPath.includes('/')) {
      const itemId = subPath.replace('items/', '');
      jPath = `/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`;
    } else if (isVideoPath) {
      /*
        Forward the whole remainder verbatim under /Videos.

        This is what makes HLS work without rewriting anything inside the
        manifests. Jellyfin emits *relative* URLs in master.m3u8 ("main.m3u8?…")
        and in the variant playlist ("hls1/main/0.mp4?…"), so the browser resolves
        them against our proxy path and they come straight back here. Mapping the
        tail through unchanged means every one of them lands on the matching
        Jellyfin route.

        Already validated against `..`, `\`, `//` and NUL above, so the tail is
        safe to pass on unencoded — encoding it would destroy the path separators
        the segment routes depend on.
      */
      jPath = `/Videos/${subPath.slice('videos/'.length)}`;
    } else if (subPath === 'system/info') {
      jPath = '/System/Info';
    } else if (subPath === 'search/hints') {
      jPath = '/Search/Hints';
    }

    const targetUrl = new URL(jPath, serverUrl);
    req.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

    // Forward auth headers to Jellyfin
    const forwardHeaders: Record<string, string> = {
      Authorization: `MediaBrowser Token="${apiKey}"`,
      'X-Emby-Token': apiKey,
    };

    if (isImage) {
      forwardHeaders['Accept'] = 'image/*,application/json';
    } else if (isMedia) {
      // Range requests must reach Jellyfin for seeking to work on progressive
      // playback and for byte-range fmp4 segments.
      const range = req.headers.get('range');
      if (range) {
        forwardHeaders['Range'] = range;
      }
      /*
        `Static=true` is now applied ONLY to progressive direct-play, and only
        when the caller has not already made a choice. Forcing it onto a
        transcode request would make Jellyfin ignore every transcoding
        parameter — including AudioStreamIndex, which is exactly why audio track
        switching silently did nothing.
      */
      if (isProgressive && !targetUrl.searchParams.has('Static')) {
        targetUrl.searchParams.set('Static', 'true');
      }
    } else {
      forwardHeaders['Accept'] = 'application/json';
      if (!targetUrl.searchParams.has('userId') && !jPath.includes('/Users/')) {
        targetUrl.searchParams.set('userId', userId);
      }
    }

    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: forwardHeaders,
      cache: isImage ? 'force-cache' : 'no-store',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Jellyfin upstream error: ${upstreamRes.status} ${upstreamRes.statusText}` },
        { status: upstreamRes.status }
      );
    }

    // Handle binary image response
    if (isImage) {
      const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await upstreamRes.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    /*
      HLS playlists.

      Read as text rather than streamed so the Content-Type can be asserted:
      some Jellyfin deployments behind a reverse proxy return `text/plain` for
      .m3u8, and hls.js refuses to parse a playlist it does not recognise.
      Playlists are never cached — for a live transcode the variant playlist
      grows as segments are produced.
    */
    if (isHlsManifest) {
      const playlist = await upstreamRes.text();
      return new NextResponse(stripEmbeddedCredentials(playlist), {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Sidecar subtitles, converted to WebVTT by Jellyfin.
    if (isSubtitle) {
      const vtt = await upstreamRes.text();
      return new NextResponse(vtt, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          // Safe to cache: a given subtitle stream never changes.
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Segments and progressive video: stream the body through with Range support.
    if (isHlsSegment || isProgressive) {
      const responseHeaders = new Headers();
      const passHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
      ];
      passHeaders.forEach((h) => {
        const val = upstreamRes.headers.get(h);
        if (val) responseHeaders.set(h, val);
      });
      if (!responseHeaders.has('accept-ranges')) {
        responseHeaders.set('accept-ranges', 'bytes');
      }
      /*
        Deliberately not cached. Segment URLs are scoped to a transcoding
        session; a cached segment from an abandoned session would be served
        against a new one and produce a decode error mid-playback.
      */
      responseHeaders.set('Cache-Control', 'no-store');

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    // Default: JSON response with high-performance browser caching
    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Jellyfin Proxy GET Error]:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Jellyfin media server' },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`jellyfin_post_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 120,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { path } = await context.params;
    const subPath = path.join('/');

    if (subPath.includes('..') || subPath.includes('\\') || subPath.includes('//') || subPath.includes('\0')) {
      return NextResponse.json({ error: 'Malformed path parameter' }, { status: 400 });
    }

    const { serverUrl, apiKey, userId } = getJellyfinConfig();

    let jPath = `/${subPath}`;
    if (subPath.includes('/playback-info')) {
      const itemId = subPath.split('/')[1];
      jPath = `/Items/${encodeURIComponent(itemId)}/PlaybackInfo?userId=${encodeURIComponent(userId)}`;
    } else if (subPath.startsWith('sessions/playing')) {
      jPath = `/${subPath}`;
    }

    const body = await req.json().catch(() => ({}));
    const targetUrl = new URL(jPath, serverUrl);

    const upstreamRes = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `MediaBrowser Token="${apiKey}"`,
        'X-Emby-Token': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.statusText}` },
        { status: upstreamRes.status }
      );
    }

    const data = await upstreamRes.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Jellyfin Proxy POST Error]:', error);
    return NextResponse.json(
      { error: 'Failed to execute Jellyfin action' },
      { status: 502 }
    );
  }
}
