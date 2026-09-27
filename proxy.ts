// Next.js middleware (Next 16 renamed it to `proxy`).
// Two jobs:
//   1. Keep a stable per-browser device id cookie (`jf_device`) that nginx reads
//      to build the MediaBrowser auth header.
//   2. Gate protected routes behind the presence of an auth session cookie.
//      (Actual token validity is checked by the API itself — a stale cookie
//      simply yields 401s, which the client handles by bouncing to /login.)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JELLYFIN_TOKEN_COOKIE, JELLYFIN_DEVICE_COOKIE } from '@/lib/jellyfin/client';

const PROTECTED_PREFIXES = ['/', '/watch', '/movie', '/series', '/watch-together', '/admin'];

function isProtected(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // (1) Stable device id — nginx needs it for the Authorization header.
  if (!request.cookies.get(JELLYFIN_DEVICE_COOKIE)?.value) {
    response.cookies.set(JELLYFIN_DEVICE_COOKIE, crypto.randomUUID(), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  // (2) Route guards. Demo mode keeps the mock catalog browseable without auth.
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
  if (!demoMode && isProtected(pathname)) {
    const hasToken = Boolean(request.cookies.get(JELLYFIN_TOKEN_COOKIE)?.value);
    if (!hasToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Run on extensionless paths only: skips /api, /jellyfin, _next, and any
  // static asset (favicon.ico, *.svg, *.css, *.js, ...).
  matcher: ['/((?!api|jellyfin|_next|.*\\..*).*)'],
};
