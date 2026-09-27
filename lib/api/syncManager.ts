// Python Sync Manager client (Google Drive -> local NVMe cache).
//
// The Python service (dinustream-sync.service, 127.0.0.1:8787) exposes:
//   GET  /health
//   POST /sync/movie            { filename }
//   GET  /sync/status/<filename>
//
// nginx maps the `/api/sync/*` prefix onto that service (prefix stripped), so
// the browser talks to `/api/sync/...` same-origin:
//   /api/sync/health               -> 127.0.0.1:8787/health
//   /api/sync/sync/movie           -> 127.0.0.1:8787/sync/movie
//   /api/sync/sync/status/<name>   -> 127.0.0.1:8787/sync/status/<name>
//
// In demo mode (or when the daemon is absent) we return synthetic "ready"
// values so the UI still works without the backend.

export type SyncState = 'not_cached' | 'starting' | 'syncing' | 'ready' | 'error';

export interface SyncStatusResponse {
  filename: string;
  movieId?: string;
  state: SyncState;
  percentage: number;
  transferredBytes: number;
  totalBytes: number;
  transferredFormatted: string;
  totalFormatted: string;
  speedBytesPerSec: number;
  speedFormatted: string;
  etaSeconds: number;
  etaFormatted: string;
  error?: string;
  updatedAt: string;
}

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
const BASE = process.env.NEXT_PUBLIC_SYNC_MANAGER_URL || '/api/sync';

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatEta(seconds: number): string {
  if (Number.isNaN(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function syntheticReady(filename: string): SyncStatusResponse {
  return {
    filename,
    state: 'ready',
    percentage: 100,
    transferredBytes: 0,
    totalBytes: 0,
    transferredFormatted: '—',
    totalFormatted: '—',
    speedBytesPerSec: 0,
    speedFormatted: '—',
    etaSeconds: 0,
    etaFormatted: 'Complete',
    updatedAt: new Date().toISOString(),
  };
}

function notCached(filename: string): SyncStatusResponse {
  return {
    filename,
    state: 'not_cached',
    percentage: 0,
    transferredBytes: 0,
    totalBytes: 0,
    transferredFormatted: '0 B',
    totalFormatted: '—',
    speedBytesPerSec: 0,
    speedFormatted: '0 B/s',
    etaSeconds: 0,
    etaFormatted: '—',
    updatedAt: new Date().toISOString(),
  };
}

function pick(data: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null) return data[k];
  }
  return undefined;
}

/** Defensive mapper: the daemon is "early" and its exact field names may drift. */
function normalize(raw: unknown, filename: string): SyncStatusResponse {
  const data = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const stateRaw = String(pick(data, ['state', 'status']) ?? '');
  const stateLower = stateRaw.toLowerCase();

  let state: SyncState = 'not_cached';
  if (stateLower.includes('ready') || stateLower.includes('complete') || stateLower.includes('cached')) state = 'ready';
  else if (stateLower.includes('start')) state = 'starting';
  else if (stateLower.includes('sync') || stateLower.includes('copy') || stateLower.includes('progress')) state = 'syncing';
  else if (stateLower.includes('error') || stateLower.includes('fail')) state = 'error';

  const percentage = Number(pick(data, ['percentage', 'percent', 'progress', 'pct']) ?? 0);
  const transferredBytes = Number(pick(data, ['transferredBytes', 'transferred', 'copied']) ?? 0);
  const totalBytes = Number(pick(data, ['totalBytes', 'total', 'size']) ?? 0);
  const speedBytesPerSec = Number(pick(data, ['speedBytesPerSec', 'speed', 'rate']) ?? 0);
  const etaSeconds = Number(pick(data, ['etaSeconds', 'eta', 'remainingSeconds']) ?? 0);

  return {
    filename,
    state,
    percentage: state === 'ready' ? 100 : Math.min(100, Math.max(0, percentage)),
    transferredBytes,
    totalBytes,
    transferredFormatted: transferredBytes ? formatBytes(transferredBytes) : '—',
    totalFormatted: totalBytes ? formatBytes(totalBytes) : '—',
    speedBytesPerSec,
    speedFormatted: speedBytesPerSec ? `${formatBytes(speedBytesPerSec)}/s` : '—',
    etaSeconds,
    etaFormatted: formatEta(etaSeconds),
    error: (pick(data, ['error', 'message']) as string) ?? undefined,
    updatedAt: (pick(data, ['updatedAt', 'timestamp']) as string) ?? new Date().toISOString(),
  };
}

export async function getSyncHealth(): Promise<{ ok: boolean }> {
  if (DEMO) return { ok: true };
  try {
    const res = await fetch(`${BASE}/health`, { credentials: 'include' });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function getSyncStatus(filename: string): Promise<SyncStatusResponse> {
  if (DEMO || !filename) return syntheticReady(filename);

  try {
    const res = await fetch(`${BASE}/sync/status/${encodeURIComponent(filename)}`, {
      credentials: 'include',
    });
    if (res.status === 404) return notCached(filename);
    if (!res.ok) return { ...notCached(filename), state: 'error', error: `HTTP ${res.status}` };
    const raw = await res.json();
    return normalize(raw, filename);
  } catch (err) {
    return { ...notCached(filename), state: 'error', error: err instanceof Error ? err.message : 'Unreachable' };
  }
}

export async function startSync(filename: string): Promise<boolean> {
  if (DEMO || !filename) return true;
  try {
    const res = await fetch(`${BASE}/sync/movie`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
