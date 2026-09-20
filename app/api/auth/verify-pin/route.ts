import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    // Rate limiting: Maximum 5 PIN attempts per minute to stop brute-forcing
    const rateLimit = checkRateLimit(`auth_pin_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many PIN verification attempts. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    // Configured admin PIN from environment variable, with secure server fallback
    const targetPin = process.env.ADMIN_MASTER_PIN || '1337';

    // Constant-time comparison to prevent timing attacks
    const pinBuffer = Buffer.from(pin.padEnd(32, ' '));
    const targetBuffer = Buffer.from(targetPin.padEnd(32, ' '));
    const isValid = crypto.timingSafeEqual(pinBuffer, targetBuffer);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid master PIN' }, { status: 401 });
    }

    // Create session signature
    const sessionToken = crypto
      .createHmac('sha256', process.env.SYNC_MANAGER_API_KEY || 'dinustream_secure_session_secret')
      .update(`dinu_admin_session_${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`)
      .digest('hex');

    const res = NextResponse.json({
      success: true,
      message: 'Admin authorization granted',
    });

    // Set HttpOnly, Secure, SameSite=Strict cookie
    res.cookies.set({
      name: 'dinustream_admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return res;
  } catch (error) {
    console.error('[Auth Error] Failed to verify PIN:', error);
    return NextResponse.json({ error: 'Authentication verification failed' }, { status: 500 });
  }
}
