/**
 * DinuStream Sync Manager API Client
 *
 * Interfaces with the private Sync Manager backend on the Oracle server.
 * All requests route through the secure Next.js API proxy to keep credentials
 * and internal server IP addresses strictly confidential.
 */

export type SyncState = 'not_cached' | 'starting' | 'syncing' | 'ready' | 'error';

export interface SyncStatusResponse {
  filename: string;
  movieId?: string;
  state: SyncState;
  percentage: number; // 0 - 100
  transferredBytes: number;
  totalBytes: number;
  transferredFormatted: string; // e.g., "4.2 GB"
  totalFormatted: string; // e.g., "18.5 GB"
  speedBytesPerSec: number;
  speedFormatted: string; // e.g., "148 MB/s"
  etaSeconds: number;
  etaFormatted: string; // e.g., "1m 32s"
  error?: string;
  updatedAt: string;
}

export interface SyncMovieRequest {
  movieId: string;
  filename: string;
  title?: string;
}

export interface SyncMovieResponse {
  success: boolean;
  message: string;
  status: SyncStatusResponse;
}

const BASE_URL = process.env.NEXT_PUBLIC_SYNC_MANAGER_BASE_URL || '/api/sync';

/**
 * Format raw byte counts into human-readable strings (MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format seconds into a clean ETA string (e.g., "2m 14s", "45s")
 */
export function formatEta(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Initiate synchronization of a movie from Google Drive master storage to Oracle NVMe SSD cache
 */
export async function syncMovie(req: SyncMovieRequest): Promise<SyncMovieResponse> {
  const res = await fetch(`${BASE_URL}/movie`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Failed to initiate movie sync');
    throw new Error(`Sync API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Poll the synchronization status of a specific media filename
 */
export async function getSyncStatus(filename: string): Promise<SyncStatusResponse> {
  const encodedFilename = encodeURIComponent(filename);
  const res = await fetch(`${BASE_URL}/status/${encodedFilename}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Failed to retrieve sync status');
    throw new Error(`Sync Status error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Check health status of the Sync Manager through the Next.js API proxy
 */
export async function getSyncHealth(): Promise<{
  status: 'online' | 'offline';
  service?: string;
  port?: number;
  message?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return { status: 'offline' };
    return res.json();
  } catch {
    return { status: 'offline' };
  }
}

