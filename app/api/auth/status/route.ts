import { NextRequest, NextResponse } from 'next/server';
import { buildAuthHeader, getServerUrl, JELLYFIN_TOKEN_COOKIE, JELLYFIN_DEVICE_COOKIE } from '@/lib/jellyfin/client';
import { JellyfinUser } from '@/lib/jellyfin/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(JELLYFIN_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  const deviceId = req.cookies.get(JELLYFIN_DEVICE_COOKIE)?.value ?? '';
  const res = await fetch(`${getServerUrl()}/Users/Me`, {
    headers: { Accept: 'application/json', Authorization: buildAuthHeader(token, deviceId) },
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ authenticated: false });

  const user = (await res.json()) as JellyfinUser;
  return NextResponse.json({ authenticated: true, userId: user.Id, userName: user.Name });
}
