import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * A note on wildcards, because it caused a real outage: a CSP host wildcard
 * matches *subdomains only*. `https://*.firestore.googleapis.com` therefore does
 * NOT match `firestore.googleapis.com`, which is the exact host the Firestore SDK
 * talks to. Every Listen/Write channel was blocked, Firestore dropped to offline
 * mode, and profiles, presence and Watch Together silently stopped syncing. Bare
 * hosts are now listed explicitly alongside their wildcards.
 *
 * Directive notes
 * ---------------
 * script-src   static.cloudflareinsights.com — Cloudflare injects its Web
 *              Analytics beacon automatically on proxied zones, and it was
 *              blocked on every single page load.
 *
 * connect-src  firestore.googleapis.com (bare) — see the wildcard note above.
 *              firebaseinstallations / securetoken / identitytoolkit — called by
 *              the Firebase SDK during init and token refresh.
 *              cloudflareinsights.com — where the beacon POSTs its payload.
 *              HLS manifests and segments are same-origin, covered by 'self'.
 *
 * media-src    blob: is REQUIRED for adaptive playback: hls.js attaches a
 *              MediaSource to the <video> element as a blob URL. Without it every
 *              HLS stream fails, and not with an obvious error.
 *
 * worker-src   'self' blob: — also required by hls.js, which runs its transmuxer
 *              in a Worker created from a blob URL. Falling back to
 *              `default-src 'self'` blocks that Worker. hls.js then degrades to
 *              transmuxing on the main thread instead of failing, so the symptom
 *              is stutter on heavier streams rather than an error — easy to miss.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://static.cloudflareinsights.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://images.unsplash.com https://commondatastorage.googleapis.com https://*.googleusercontent.com https://giphy.com https://*.giphy.com https://tenor.com https://*.tenor.com;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' blob: https://firestore.googleapis.com https://*.firestore.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com wss://*.firestore.googleapis.com https://cloudflareinsights.com https://static.cloudflareinsights.com https://images.unsplash.com https://api.giphy.com https://tenor.googleapis.com http://localhost:* http://127.0.0.1:*;
  media-src 'self' blob: data: https://commondatastorage.googleapis.com http://localhost:* http://127.0.0.1:*;
  worker-src 'self' blob:;
  child-src 'self' blob:;
  frame-ancestors 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
      },
      {
        protocol: 'https',
        hostname: 'media.tenor.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      /*
        Deliberately NOT adding a blanket no-store for /api/jellyfin/*.

        Playlists and segments already set `no-store` in the route handler, which
        is what matters (segment URLs are scoped to one transcoding session, so a
        cached segment served against a new session decodes as garbage). A
        catch-all header here would apply to poster and backdrop responses too,
        overriding their `public, max-age=604800, immutable` and forcing every
        artwork request to re-fetch on every navigation.
      */
    ];
  },
};

export default nextConfig;
