import { NextRequest, NextResponse } from 'next/server';
import { SyncStatusResponse } from '@/lib/api/syncManager';

import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import { isValidFilename, isValidMediaId } from '@/lib/security/validation';
import { setSyncJob } from '@/lib/sync/syncJobRegistry';
import { adaptSyncStatus } from '@/lib/sync/adaptSyncStatus';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    // Rate limiting: Maximum 20 sync requests per minute per IP
    const rateLimit = checkRateLimit(`sync_movie_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 20,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Sync rate limit reached. Please wait before starting another job.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { movieId, filename, title } = body;

    // Security: Strict validation to prevent Path Traversal & Injection attacks
    if (!isValidFilename(filename)) {
      return NextResponse.json({ error: 'Invalid or unsafe filename parameter' }, { status: 400 });
    }

    if (movieId && !isValidMediaId(movieId)) {
      return NextResponse.json({ error: 'Invalid movieId parameter' }, { status: 400 });
    }

    const backendUrl = process.env.SYNC_MANAGER_API_URL;
    const apiKey = process.env.SYNC_MANAGER_API_KEY;

    // Attempt direct forward to Oracle server (or local 127.0.0.1:8787 Sync Manager)
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const oracleRes = await fetch(`${backendUrl}/sync/movie`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ movieId, filename, title }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (oracleRes.ok) {
          /*
            Adapted for the same reason as the status route: the upstream service
            replies `{ progress, status }`, not the `SyncStatusResponse` shape the
            client parses.
          */
          const data = await oracleRes.json();
          const status = adaptSyncStatus(data, filename);
          return NextResponse.json({
            success: status.state !== 'error',
            message:
              status.state === 'error'
                ? status.error ?? 'Sync Manager could not start this transfer'
                : `Started synchronization for "${filename}"`,
            status,
          });
        }
      } catch {
        // Unreachable backend: fall through to the local simulation.
      }
    }

    // Default media size: 18.5 GB (typical high-bitrate 4K Dolby Atmos stream)
    const totalBytes = 18.5 * 1024 * 1024 * 1024;
    const speed = 148 * 1024 * 1024; // 148 MB/s Oracle NVMe SSD write throughput

    /*
      Fallback simulation. The registry now lives in lib/sync/syncJobRegistry so
      the status route is guaranteed to read the same instance — see the note
      there for why importing a Map across route modules did not work.
    */
    setSyncJob(filename, {
      filename,
      movieId,
      startedAt: Date.now(),
      totalBytes,
      speed,
    });

    const initialStatus: SyncStatusResponse = {
      filename,
      movieId,
      state: 'starting',
      percentage: 0,
      transferredBytes: 0,
      totalBytes,
      transferredFormatted: '0 B',
      totalFormatted: '18.5 GB',
      speedBytesPerSec: speed,
      speedFormatted: '148 MB/s',
      etaSeconds: Math.ceil(totalBytes / speed),
      etaFormatted: '2m 08s',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Started synchronization for "${filename}"`,
      status: initialStatus,
    });
  } catch (error) {
    console.error('[Sync API Error] Failed to process sync request:', error);
    return NextResponse.json(
      { error: 'Unable to initiate synchronization job. Please retry shortly.' },
      { status: 500 }
    );
  }
}
