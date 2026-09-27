import { NextResponse } from 'next/server';
import { JELLYFIN_TOKEN_COOKIE, JELLYFIN_USER_COOKIE } from '@/lib/jellyfin/client';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const name of [JELLYFIN_TOKEN_COOKIE, JELLYFIN_USER_COOKIE]) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
