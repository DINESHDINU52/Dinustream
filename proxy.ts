import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/*
  Imported from `session-payload`, not `session`: this file runs in the Edge
  Runtime, which cannot load the `node:crypto` used for HMAC signing.

  NOTE: `parseSessionPayload` only decodes the cookie and checks its expiry — it
  does not verify the signature, so this gate accepts a *well-formed* token
  rather than an *authentic* one. Signature verification happens in
  /api/auth/session. Moving the full check in here requires porting the HMAC to
  Web Crypto (`crypto.subtle`), which changes the auth path and is left for an
  explicit decision.
*/
import { SESSION_COOKIE_NAME, parseSessionPayload } from '@/lib/security/session-payload';

/**
 * Request gate for the private cinema.
 *
 * Renamed from `middleware.ts` to `proxy.ts`: the `middleware` file convention
 * is deprecated in Next 16 and the build emits a deprecation warning for it.
 * The exported function must be named `proxy` (or be the default export).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next internals, public auth endpoints, media proxies and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/jellyfin') ||
    pathname.startsWith('/api/dolby') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const session = sessionCookie ? parseSessionPayload(sessionCookie.value) : null;
  const isAuthenticated = Boolean(session);

  // /login is only reachable while signed out
  if (pathname === '/login') {
    return isAuthenticated ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!isAuthenticated) {
    // API routes get a 401 rather than an HTML redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next's static output and the favicon. The asset
     * extension check above is kept as a second guard for files served from
     * /public.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
