// Same-origin proxy to the Jellyfin server.
//
// In PRODUCTION nginx already forwards `/jellyfin/*` directly to :8096 and
// injects the MediaBrowser auth header from cookies — this handler is only
// reached when nginx is NOT in front (local dev, `npm run dev`). It mirrors the
// nginx behaviour so client code is identical in both environments.
//
// It also keeps the token server-side: we read the httpOnly cookies and build
// the Authorization header here, never exposing it to the browser.
//
// HLS manifests: Jellyfin is running at its root path (no BaseUrl) in dev, so
// the .m3u8 playlists it returns reference `/videos/...` / `http://host/videos/...`
// URLs. hls.js would resolve those against the page origin (localhost:3001) and
// miss this proxy. We rewrite media URLs in manifests to `/jellyfin/videos/...`
// so every segment still flows through here (where the auth header is added).

import { NextRequest, NextResponse } from 'next/server';
import { buildAuthHeader, getServerUrl, JELLYFIN_TOKEN_COOKIE, JELLYFIN_DEVICE_COOKIE } from '@/lib/jellyfin/client';

const SERVER_URL = getServerUrl();

const FORWARDED_HEADERS = ['accept', 'content-type', 'range', 'user-agent'];

function rewriteHlsManifest(body: string): string {
  // 1) Strip any absolute origin (e.g. http://127.0.0.1:8096/) →
  //    root-relative /videos/...
  // 2) Prefix root-relative media paths with /jellyfin, unless already prefixed.
  //    Boundary set includes line breaks so full-line URLs are caught too.
  return body
    .replace(/(https?:\/\/[^/\s"'$]+\/)/g, '/')
    .replace(/(^|[ "'=,\n\r])\/(?!jellyfin)(videos|audio|hls)\//g, '$1/jellyfin/$2/');
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `${SERVER_URL}/${path.join('/')}${req.nextUrl.search}`;

  const token = req.cookies.get(JELLYFIN_TOKEN_COOKIE)?.value ?? '';
  const deviceId = req.cookies.get(JELLYFIN_DEVICE_COOKIE)?.value ?? '';

  const headers = new Headers();
  headers.set('Authorization', buildAuthHeader(token, deviceId));
  for (const name of FORWARDED_HEADERS) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    ...(hasBody ? { body: req.body as ReadableStream, duplex: 'half' as const } : {}),
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (lk === 'content-encoding' || lk === 'transfer-encoding' || lk === 'connection' || lk === 'content-length') {
      return;
    }
    responseHeaders.set(key, value);
  });

  // HLS manifest rewriting (dev only path — prod nginx handles all of this).
  const requestPath = path.join('/');
  const upstreamContentType = (upstream.headers.get('content-type') ?? '').toLowerCase();
  const isManifest = requestPath.endsWith('.m3u8') || upstreamContentType.includes('mpegurl');

  if (isManifest) {
    const text = await upstream.text();
    responseHeaders.set('content-type', 'application/vnd.apple.mpegurl');
    return new NextResponse(rewriteHlsManifest(text), { status: upstream.status, headers: responseHeaders });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE, proxy as PATCH };