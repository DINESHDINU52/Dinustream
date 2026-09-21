import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, parseSessionPayload } from '@/lib/security/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, Next internal files, and public auth endpoints
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
  const isAuthenticated = !!session;

  // If visiting /login:
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Already logged in, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated, redirect to /login
  if (!isAuthenticated) {
    // If it's an API route (other than /api/auth), return 401 JSON
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
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
