import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/security/session';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`login_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 15,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { profileId, pin } = body;

    if (!profileId || (profileId !== 'dinu' && profileId !== 'kanmani')) {
      return NextResponse.json({ error: 'Invalid profile selected' }, { status: 400 });
    }

    // Dinu profile PIN check (if configured)
    if (profileId === 'dinu') {
      const targetPin = process.env.ADMIN_MASTER_PIN;
      if (targetPin) {
        if (!pin || typeof pin !== 'string') {
          return NextResponse.json({ error: 'PIN required for Dinu profile' }, { status: 401 });
        }

        const pinBuf = Buffer.from(pin.padEnd(32, ' '));
        const targetBuf = Buffer.from(targetPin.padEnd(32, ' '));
        if (pinBuf.length !== targetBuf.length || !crypto.timingSafeEqual(pinBuf, targetBuf)) {
          return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
        }
      }
    }

    const token = createSessionToken(profileId);

    const response = NextResponse.json({
      success: true,
      profile: {
        id: profileId,
        name: profileId === 'dinu' ? 'Dinu' : 'Kanmani',
      },
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[Login API Error]:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
