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

    const isStream = subPath.startsWith('videos/') && subPath.includes('/stream');

    // Rate limit non-stream requests
    if (!isStream) {
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
    } else if (isStream) {
      // /videos/:id/stream
      const parts = subPath.split('/');
      const itemId = parts[1];
      jPath = `/Videos/${encodeURIComponent(itemId)}/stream`;
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
    } else if (isStream) {
      const range = req.headers.get('range');
      if (range) {
        forwardHeaders['Range'] = range;
      }
      if (!targetUrl.searchParams.has('Static')) {
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

    // Handle video streaming response (with Range support)
    if (isStream) {
      const responseHeaders = new Headers();
      const passHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
      ];
      passHeaders.forEach((h) => {
        const val = upstreamRes.headers.get(h);
        if (val) responseHeaders.set(h, val);
      });
      if (!responseHeaders.has('accept-ranges')) {
        responseHeaders.set('accept-ranges', 'bytes');
      }

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
