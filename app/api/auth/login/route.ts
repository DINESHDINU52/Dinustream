import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/security/session';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import { PROFILES } from '@/lib/constants';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`login_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { profileId, pin, guestName } = body;

    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json({ error: 'Invalid profile selected' }, { status: 400 });
    }

    let displayName = PROFILES[profileId]?.name || guestName || profileId;

    // Dinu profile PIN check (master PIN or 1337)
    if (profileId === 'dinu') {
      const targetPin = process.env.ADMIN_MASTER_PIN || '1337';
      if (!pin || typeof pin !== 'string') {
        return NextResponse.json({ error: 'PIN required for this profile' }, { status: 401 });
      }

      const pinBuf = Buffer.from(pin.padEnd(32, ' '));
      const targetBuf = Buffer.from(targetPin.padEnd(32, ' '));
      if (pinBuf.length !== targetBuf.length || !crypto.timingSafeEqual(pinBuf, targetBuf)) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
      }
    }

    // Kanmani profile PIN check (configured or 2026)
    else if (profileId === 'kanmani') {
      const targetPin = process.env.KANMANI_MASTER_PIN || '2026';
      if (!pin || typeof pin !== 'string') {
        return NextResponse.json({ error: 'PIN required for this profile' }, { status: 401 });
      }

      const pinBuf = Buffer.from(pin.padEnd(32, ' '));
      const targetBuf = Buffer.from(targetPin.padEnd(32, ' '));
      if (pinBuf.length !== targetBuf.length || !crypto.timingSafeEqual(pinBuf, targetBuf)) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
      }
    }

    // Dynamic and Guest profiles
    else {
      if (guestName) {
        displayName = guestName;
      }
    }

    const token = createSessionToken(profileId, displayName);

    const response = NextResponse.json({
      success: true,
      profile: {
        id: profileId,
        name: displayName,
      },
    });

    // Set HTTP-only secure cookie (30 days)
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[Login API Error]:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
