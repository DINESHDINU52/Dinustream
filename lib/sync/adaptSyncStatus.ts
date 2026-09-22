import { SyncState, SyncStatusResponse, formatBytes, formatEta } from '@/lib/api/syncManager';

/**
 * Adapt the real Sync Manager's response into the shape the app expects.
 *
 * THE 0% BUG
 * ----------
 * The Sync Manager running on Oracle answers with its own vocabulary:
 *
 *     { "progress": 0, "status": "error" }
 *
 * The client type is `SyncStatusResponse`, which uses `percentage` and `state`.
 * The proxy routes previously did `return NextResponse.json(data)` — handing the
 * upstream body straight through, unmodified. So `status.percentage` and
 * `status.state` were both `undefined` on every poll, and the progress UI, which
 * does `percentage ?? 0`, displayed 0% forever no matter what the backend was
 * actually doing.
 *
 * This maps the two vocabularies and tolerates the variations a small service
 * like this tends to drift between (`progress` vs `percent` vs `percentage`,
 * `complete` vs `done` vs `ready`), so a future rename upstream degrades to a
 * sensible state instead of silently reading as zero again.
 */

/** Anything the upstream service might plausibly send. */
interface RawSyncPayload {
  // Progress, in percent.
  progress?: number;
  percent?: number;
  percentage?: number;
  // State.
  status?: string;
  state?: string;
  // Byte counters.
  transferred?: number;
  transferredBytes?: number;
  total?: number;
  totalBytes?: number;
  size?: number;
  // Throughput and ETA.
  speed?: number;
  speedBytesPerSec?: number;
  eta?: number;
  etaSeconds?: number;
  // Diagnostics.
  error?: string;
  message?: string;
  filename?: string;
  movieId?: string;
}

/** Map the upstream state vocabulary onto our `SyncState` union. */
function normaliseState(raw: string | undefined, percentage: number): SyncState {
  const value = (raw ?? '').toLowerCase().trim();

  switch (value) {
    case 'ready':
    case 'complete':
    case 'completed':
    case 'done':
    case 'cached':
    case 'finished':
      return 'ready';

    case 'syncing':
    case 'downloading':
    case 'transferring':
    case 'in_progress':
    case 'running':
      return 'syncing';

    case 'starting':
    case 'queued':
    case 'pending':
    case 'initialising':
    case 'initializing':
      return 'starting';

    case 'error':
    case 'failed':
    case 'failure':
      return 'error';

    case 'not_cached':
    case 'not_found':
    case 'missing':
    case 'idle':
    case 'none':
      return 'not_cached';

    default:
      /*
        Unknown vocabulary: infer from progress rather than defaulting to a state
        that would either block the UI or falsely claim success.
      */
      if (percentage >= 100) return 'ready';
      if (percentage > 0) return 'syncing';
      return 'not_cached';
  }
}

function firstNumber(...values: Array<number | undefined>): number {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return 0;
}

/**
 * Normalise an upstream payload.
 *
 * `filename` is passed separately because the upstream response does not always
 * echo it back, and every consumer keys off it.
 */
export function adaptSyncStatus(raw: unknown, filename: string): SyncStatusResponse {
  const payload = (raw ?? {}) as RawSyncPayload;

  const percentageRaw = firstNumber(payload.percentage, payload.progress, payload.percent);
  const percentage = Math.min(100, Math.max(0, Math.round(percentageRaw)));

  const state = normaliseState(payload.status ?? payload.state, percentage);

  const totalBytes = firstNumber(payload.totalBytes, payload.total, payload.size);
  const transferredBytes = firstNumber(payload.transferredBytes, payload.transferred);
  const speedBytesPerSec = firstNumber(payload.speedBytesPerSec, payload.speed);
  const etaSeconds = firstNumber(payload.etaSeconds, payload.eta);

  return {
    filename: payload.filename ?? filename,
    movieId: payload.movieId,
    state,
    percentage,
    transferredBytes,
    totalBytes,
    // Em dash rather than "0 B" when the backend reports no counters at all —
    // claiming 0 B of 0 B implies knowledge the service did not give us.
    transferredFormatted: transferredBytes > 0 ? formatBytes(transferredBytes) : '—',
    totalFormatted: totalBytes > 0 ? formatBytes(totalBytes) : '—',
    speedBytesPerSec,
    speedFormatted: speedBytesPerSec > 0 ? `${formatBytes(speedBytesPerSec)}/s` : '—',
    etaSeconds,
    etaFormatted: etaSeconds > 0 ? formatEta(etaSeconds) : state === 'ready' ? 'Ready' : '—',
    error: state === 'error' ? (payload.error ?? payload.message ?? 'Sync Manager reported an error') : undefined,
    updatedAt: new Date().toISOString(),
  };
}
