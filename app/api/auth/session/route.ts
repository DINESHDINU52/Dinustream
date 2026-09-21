import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/security/session';
import { PROFILES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = verifySessionToken(cookie.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const profile = PROFILES[session.profileId] || {
    id: session.profileId,
    name: session.name || 'Cinema Guest',
    title: 'Cinema Guest',
    avatarUrl: '/avatars/guest.svg',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    favoriteGenre: 'Blockbusters & Cinema Hits',
    isOnline: true,
    isGuest: true,
    pinProtected: false,
  };

  return NextResponse.json({
    authenticated: true,
    profileId: session.profileId,
    profile,
  });
}
