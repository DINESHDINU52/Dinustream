/**
 * Shared registry for simulated cache-sync jobs.
 *
 * This exists as its own module for one specific reason: the registry used to be
 * a `Map` exported from `app/api/sync/movie/route.ts` and imported by
 * `app/api/sync/status/[filename]/route.ts`. Route handlers are separate entry
 * points in the bundle, so the two files could each end up with their own
 * instance of that `Map`. The POST route would record a job, the GET route would
 * look in an empty registry, find nothing, and report `not_cached` at 0% — which
 * is exactly the "stuck at 0%" behaviour seen in production but never in dev,
 * where a single warm process happened to share the module.
 *
 * Hanging it off `globalThis` makes it survive both module duplication and the
 * module re-evaluation that happens on hot reload.
 *
 * This is still only a *simulation*. It is the fallback used when
 * `SYNC_MANAGER_API_URL` is unset or the real Sync Manager is unreachable, and it
 * is no longer on the playback path — nothing waits for it before playing.
 */

export interface SyncJob {
  filename: string;
  movieId?: string;
  startedAt: number;
  totalBytes: number;
  speed: number;
}

const GLOBAL_KEY = '__dinustream_sync_job_registry__';

type RegistryHost = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, SyncJob>;
};

function getRegistry(): Map<string, SyncJob> {
  const host = globalThis as RegistryHost;
  if (!host[GLOBAL_KEY]) {
    host[GLOBAL_KEY] = new Map<string, SyncJob>();
  }
  return host[GLOBAL_KEY];
}

export function setSyncJob(filename: string, job: SyncJob): void {
  getRegistry().set(filename, job);
}

export function getSyncJob(filename: string): SyncJob | undefined {
  return getRegistry().get(filename);
}

export function deleteSyncJob(filename: string): boolean {
  return getRegistry().delete(filename);
}

export function getAllSyncJobs(): SyncJob[] {
  return Array.from(getRegistry().values());
}
