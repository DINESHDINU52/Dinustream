import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthHeader,
  getServerUrl,
  JELLYFIN_TOKEN_COOKIE,
  JELLYFIN_USER_COOKIE,
  JELLYFIN_DEVICE_COOKIE,
  JELLYFIN_API_KEY_COOKIE,
} from '@/lib/jellyfin/client';
import { JellyfinAuthenticationResult } from '@/lib/jellyfin/types';

export const runtime = 'nodejs';

const AUTH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const username = (body.username ?? '').trim();
  const password = body.password ?? '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  let deviceId = req.cookies.get(JELLYFIN_DEVICE_COOKIE)?.value;
  if (!deviceId) deviceId = crypto.randomUUID();

  const res = await fetch(`${getServerUrl()}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: buildAuthHeader('', deviceId),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const message = /"message":"([^"]+)"/.exec(text)?.[1] ?? 'Invalid username or password';
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const data = (await res.json()) as JellyfinAuthenticationResult;
  const token = data.AccessToken;
  const userId = data.User?.Id;
  if (!token || !userId) {
    return NextResponse.json({ error: 'Server returned no session' }, { status: 502 });
  }

  const response = NextResponse.json({
    ok: true,
    userId,
    userName: data.User?.Name ?? username,
  });

  response.cookies.set(JELLYFIN_TOKEN_COOKIE, token, AUTH_COOKIE_OPTS);
  response.cookies.set(JELLYFIN_USER_COOKIE, userId, { ...AUTH_COOKIE_OPTS, httpOnly: false });
  response.cookies.set(JELLYFIN_DEVICE_COOKIE, deviceId, AUTH_COOKIE_OPTS);

  // Dev only: the WebSocket can't set custom headers, so it authenticates with
  // ?ApiKey=. That key must be readable by JS in development.
  if (process.env.NODE_ENV !== 'production') {
    response.cookies.set(JELLYFIN_API_KEY_COOKIE, token, { ...AUTH_COOKIE_OPTS, httpOnly: false });
  }

  return response;
}
