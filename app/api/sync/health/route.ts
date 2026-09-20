import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`sync_health_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const backendUrl = process.env.SYNC_MANAGER_API_URL || 'http://127.0.0.1:8787';
    const apiKey = process.env.SYNC_MANAGER_API_KEY;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: 'online',
          backend: 'Oracle Cloud Compute',
          data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Backend is currently unreachable; fall through to structured status response
    }

    // Return structured status without leaking internal system errors
    return NextResponse.json({
      status: 'offline',
      service: 'DinuStream Sync Manager',
      port: 8787,
      fallbackMode: true,
      message: 'Sync Manager backend offline or unconfigured on internal port 8787',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync Health Error]:', error);
    return NextResponse.json(
      { error: 'Unable to query Sync Manager health' },
      { status: 500 }
    );
  }
}
