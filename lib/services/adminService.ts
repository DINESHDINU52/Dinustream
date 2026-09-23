'use client';

import {
  AdminTelemetrySummary,
  CachedMedia,
  SyncJob,
  SSDStorageMetrics,
  ServiceTelemetry,
  ActivePlaybackTelemetry,
} from '@/types/admin';

// Initial baseline defaults until live telemetry loads from /api/admin/telemetry
const INITIAL_STORAGE: SSDStorageMetrics = {
  totalGb: 200,
  usedGb: 0,
  freeGb: 200,
  usedPercentage: 0,
  breakdown: {
    moviesGb: 0,
    seriesGb: 0,
    spatialAudioGb: 0,
    systemBufferGb: 0,
  },
};

const INITIAL_SERVICES: Record<string, ServiceTelemetry> = {
  jellyfin: {
    name: 'Jellyfin Media Engine',
    status: 'healthy',
    latencyMs: 24,
    uptime: 'Connecting...',
    details: 'dinustream • Direct Play 4K Enabled',
    endpoint: '/api/jellyfin',
    lastChecked: 'Checking...',
  },
  syncManager: {
    name: 'Oracle NVMe Sync Engine',
    status: 'healthy',
    latencyMs: 14,
    uptime: 'Connecting...',
    details: 'High-speed SSD Direct I/O • Port 8787',
    endpoint: '/api/sync',
    lastChecked: 'Checking...',
  },
  googleDrive: {
    name: 'Google Drive Vault',
    status: 'healthy',
    latencyMs: 28,
    uptime: 'Connecting...',
    details: 'Cloud Storage API Connected',
    endpoint: 'gdrive-vault',
    lastChecked: 'Checking...',
  },
  firebase: {
    name: 'Firebase Realtime Presence',
    status: 'healthy',
    latencyMs: 32,
    uptime: 'Connecting...',
    details: 'Cloud Firestore • SyncPlay Realtime Channel',
    endpoint: 'dinustream-58462.firebaseapp.com',
    lastChecked: 'Checking...',
  },
};

class AdminService {
  private services = { ...INITIAL_SERVICES };
  private storage = { ...INITIAL_STORAGE };
  private cachedMedia: CachedMedia[] = [];
  private syncJobs: SyncJob[] = [];
  private livePlayback: ActivePlaybackTelemetry | null = null;
  private subscribers: Array<() => void> = [];
  private hasLoadedRealData = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.refreshRealServiceHealth();
      setInterval(() => {
        this.refreshRealServiceHealth();
      }, 10000);
    }
  }

  public async refreshRealServiceHealth() {
    try {
      const res = await fetch('/api/admin/telemetry', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (res.ok) {
        const data: AdminTelemetrySummary = await res.json();
        this.services = {
          jellyfin: data.jellyfin,
          syncManager: data.syncManager,
          googleDrive: data.googleDrive,
          firebase: data.firebase,
        };
        this.storage = data.storage;
        this.cachedMedia = data.cachedMedia || [];
        this.syncJobs = data.syncJobs || [];
        this.livePlayback = data.livePlayback || null;
        this.hasLoadedRealData = true;
        this.notifySubscribers();
        return;
      }
    } catch (err) {
      console.warn('[AdminService] Telemetry fetch error:', err);
    }

    // Fallback: update Jellyfin direct health if telemetry endpoint failed
    const jStart = Date.now();
    try {
      const res = await fetch('/api/jellyfin/system/info');
      const jLatency = Date.now() - jStart;
      if (res.ok) {
        const info = await res.json();
        this.services.jellyfin = {
          name: 'Jellyfin Media Server',
          status: 'healthy',
          latencyMs: jLatency,
          uptime: 'Operational',
          details: `${info.ServerName || 'dinustream'} • v${info.Version || '12.1.0'} • Direct Play 4K`,
          endpoint: '/api/jellyfin',
          lastChecked: 'Just now',
        };
      } else {
        this.services.jellyfin.status = 'degraded';
      }
    } catch {
      this.services.jellyfin.status = 'offline';
    }

    this.notifySubscribers();
  }

  public getTelemetry(): AdminTelemetrySummary {
    return {
      jellyfin: { ...this.services.jellyfin },
      syncManager: { ...this.services.syncManager },
      googleDrive: { ...this.services.googleDrive },
      firebase: { ...this.services.firebase },
      storage: { ...this.storage },
      cachedMedia: [...this.cachedMedia],
      syncJobs: [...this.syncJobs],
      livePlayback: this.livePlayback ? { ...this.livePlayback } : null,
    };
  }

  public removeCachedMedia(mediaId: string): void {
    this.removeCache(mediaId);
  }

  public removeCache(mediaId: string): void {
    const item = this.cachedMedia.find((m) => m.id === mediaId);
    if (!item) return;

    this.cachedMedia = this.cachedMedia.filter((m) => m.id !== mediaId);
    this.storage.usedGb = Math.max(0, +(this.storage.usedGb - item.sizeGb).toFixed(1));
    this.storage.freeGb = Math.min(this.storage.totalGb, +(this.storage.freeGb + item.sizeGb).toFixed(1));
    this.storage.usedPercentage = +((this.storage.usedGb / this.storage.totalGb) * 100).toFixed(1);

    this.notifySubscribers();
  }

  public refreshCache(mediaId: string): void {
    const item = this.cachedMedia.find((m) => m.id === mediaId);
    if (!item) return;

    item.lastAccessed = 'Just now';
    this.notifySubscribers();
  }

  public queueNewSync(title: string, sizeGb: number): void {
    this.triggerNewSync(title, sizeGb);
  }

  public async triggerNewSync(title: string, sizeGb: number): Promise<void> {
    const sizeNumber = Number(sizeGb) || 2.5;

    // Immediately show the job in UI
    const tempJob: SyncJob = {
      id: `sync-job-${Date.now()}`,
      mediaId: `media-${Date.now()}`,
      title,
      fileSizeGb: sizeNumber,
      transferredGb: 0,
      progressPercent: 0,
      speedMbps: 250.0,
      etaSeconds: Math.ceil((sizeNumber * 1024 * 8) / 250),
      status: 'syncing',
      startedAt: 'Just now',
      source: 'Oracle Cloud',
    };

    this.syncJobs = [tempJob, ...this.syncJobs];
    this.notifySubscribers();

    // Send to backend API
    try {
      await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sizeGb: sizeNumber }),
      });
      // Refresh to get server status
      await this.refreshRealServiceHealth();
    } catch (err) {
      console.error('[AdminService] Failed to trigger sync:', err);
    }
  }

  public retrySyncJob(jobId: string): void {
    const job = this.syncJobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = 'syncing';
    job.progressPercent = 10;
    job.speedMbps = 220.0;
    job.error = undefined;
    this.notifySubscribers();
  }

  public setLivePlayback(telemetry: ActivePlaybackTelemetry | null): void {
    this.livePlayback = telemetry;
    this.notifySubscribers();
  }

  public subscribe(fn: () => void): () => void {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((fn) => fn());
  }
}

export const adminService = new AdminService();
