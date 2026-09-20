import { NextRequest, NextResponse } from 'next/server';
import { SyncStatusResponse, formatBytes, formatEta } from '@/lib/api/syncManager';
import { mockSyncRegistry } from '@/app/api/sync/movie/route';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import { isValidFilename } from '@/lib/security/validation';

// Pre-cached files for testing the "If movie is cached -> play immediately" behavior
const CACHED_PRESETS = new Set<string>([
  'dune-part-two.mkv',
  'severance-s01e01.mkv',
  'interstellar.mkv',
]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const clientIp = getClientIp(req.headers);

    // Rate limiting: Maximum 120 status checks per minute per IP
    const rateLimit = checkRateLimit(`sync_status_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 120,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded for status polling' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { filename: rawFilename } = await context.params;
    const filename = decodeURIComponent(rawFilename);

    // Security: Strict validation to prevent Path Traversal & Injection attacks
    if (!isValidFilename(filename)) {
      return NextResponse.json({ error: 'Invalid or unsafe filename parameter' }, { status: 400 });
    }

    const backendUrl = process.env.SYNC_MANAGER_API_URL;
    const apiKey = process.env.SYNC_MANAGER_API_KEY;

    // Attempt direct forward to Oracle server (or local 127.0.0.1:8787 Sync Manager)
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const oracleRes = await fetch(`${backendUrl}/sync/status/${encodeURIComponent(filename)}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (oracleRes.ok) {
          const data = await oracleRes.json();
          return NextResponse.json(data);
        }
      } catch {
        // Fall back to local synchronization state
      }
    }

    // 1. Check if item is already pre-cached on Oracle NVMe SSD
    if (CACHED_PRESETS.has(filename.toLowerCase())) {
      const cachedStatus: SyncStatusResponse = {
        filename,
        state: 'ready',
        percentage: 100,
        transferredBytes: 18.5 * 1024 * 1024 * 1024,
        totalBytes: 18.5 * 1024 * 1024 * 1024,
        transferredFormatted: '18.5 GB',
        totalFormatted: '18.5 GB',
        speedBytesPerSec: 0,
        speedFormatted: 'Cached (NVMe SSD)',
        etaSeconds: 0,
        etaFormatted: 'Ready',
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(cachedStatus);
    }

    // 2. Check if a sync job is actively running in memory
    const existingJob = mockSyncRegistry.get(filename);
    if (!existingJob) {
      const notCachedStatus: SyncStatusResponse = {
        filename,
        state: 'not_cached',
        percentage: 0,
        transferredBytes: 0,
        totalBytes: 18.5 * 1024 * 1024 * 1024,
        transferredFormatted: '0 B',
        totalFormatted: '18.5 GB',
        speedBytesPerSec: 0,
        speedFormatted: '0 MB/s',
        etaSeconds: 0,
        etaFormatted: '--',
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(notCachedStatus);
    }

    // 3. Compute realistic real-time sync progress (e.g., fast sync over 6-8 seconds for testing)
    const elapsedSeconds = (Date.now() - existingJob.startedAt) / 1000;
    // Speed: ~2.5 GB/s simulated rate so a 18.5GB movie syncs completely in ~7.5 seconds
    const simulatedRate = (existingJob.totalBytes / 7.5);
    const transferred = Math.min(existingJob.totalBytes, elapsedSeconds * simulatedRate);
    const percentage = Math.min(100, Math.round((transferred / existingJob.totalBytes) * 100));

    const isDone = percentage >= 100;
    const remainingBytes = Math.max(0, existingJob.totalBytes - transferred);
    const currentSpeed = isDone ? 0 : 148 * 1024 * 1024 + Math.round(Math.sin(elapsedSeconds) * 20 * 1024 * 1024);
    const etaSeconds = isDone ? 0 : Math.ceil(remainingBytes / (currentSpeed || 1));

    const status: SyncStatusResponse = {
      filename,
      movieId: existingJob.movieId,
      state: isDone ? 'ready' : elapsedSeconds < 0.8 ? 'starting' : 'syncing',
      percentage,
      transferredBytes: transferred,
      totalBytes: existingJob.totalBytes,
      transferredFormatted: formatBytes(transferred),
      totalFormatted: formatBytes(existingJob.totalBytes),
      speedBytesPerSec: currentSpeed,
      speedFormatted: isDone ? 'Cached' : `${formatBytes(currentSpeed)}/s`,
      etaSeconds,
      etaFormatted: isDone ? 'Ready' : formatEta(etaSeconds),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('[Sync Status API Error] Failed to retrieve status:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve media cache status' },
      { status: 500 }
    );
  }
}
