'use client';

import {
  AdminTelemetrySummary,
  CachedMedia,
  SyncJob,
  SSDStorageMetrics,
  ActivePlaybackTelemetry,
} from '@/types/admin';

const CLEAN_TELEMETRY: AdminTelemetrySummary = {
  jellyfin: {
    name: 'Jellyfin Media Server',
    status: 'healthy',
    latencyMs: 12,
    uptime: '99.98%',
    details: 'Direct Stream active • Hardware NVENC Transcode Ready',
    endpoint: 'https://jellyfin.local:8096',
    lastChecked: 'Just now',
  },
  syncManager: {
    name: 'Sync Engine & Cache Daemon',
    status: 'healthy',
    latencyMs: 3,
    uptime: '100%',
    details: 'Zero buffer starvation • NVMe cache ready',
    lastChecked: 'Just now',
  },
  googleDrive: {
    name: 'High-Speed Cloud Vault',
    status: 'healthy',
    latencyMs: 24,
    uptime: '99.9%',
    details: 'API Quota: OK • Multi-thread Rclone ready',
    lastChecked: 'Just now',
  },
  firebase: {
    name: 'Realtime Sync & Presence',
    status: 'healthy',
    latencyMs: 8,
    uptime: '100%',
    details: 'WebSocket active • Authoritative server clock',
    lastChecked: 'Just now',
  },
  storage: {
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
  },
  cachedMedia: [],
  syncJobs: [],
  livePlayback: null,
};

let telemetryStore: AdminTelemetrySummary = { ...CLEAN_TELEMETRY };
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

export const adminService = {
  getTelemetry(): AdminTelemetrySummary {
    return telemetryStore;
  },

  async getTelemetrySummary(): Promise<AdminTelemetrySummary> {
    return telemetryStore;
  },

  async getStorageMetrics(): Promise<SSDStorageMetrics> {
    return telemetryStore.storage;
  },

  async getCachedMedia(): Promise<CachedMedia[]> {
    return telemetryStore.cachedMedia;
  },

  async getSyncJobs(): Promise<SyncJob[]> {
    return telemetryStore.syncJobs;
  },

  async getLivePlayback(): Promise<ActivePlaybackTelemetry | null> {
    return telemetryStore.livePlayback;
  },

  setLivePlayback(playback: ActivePlaybackTelemetry | null): void {
    telemetryStore.livePlayback = playback;
    notify();
  },

  updateStorage(storage: SSDStorageMetrics): void {
    telemetryStore.storage = storage;
    notify();
  },

  removeCachedMedia(id: string): void {
    telemetryStore.cachedMedia = telemetryStore.cachedMedia.filter((m) => m.id !== id);
    notify();
  },

  retrySyncJob(id: string): void {
    telemetryStore.syncJobs = telemetryStore.syncJobs.map((j) =>
      j.id === id ? { ...j, status: 'syncing', progressPercent: 10 } : j
    );
    notify();
  },

  queueNewSync(title: string, sizeGb: number): void {
    const newJob: SyncJob = {
      id: 'job-' + Date.now(),
      mediaId: 'sync-' + Date.now(),
      title,
      fileSizeGb: sizeGb,
      transferredGb: 0,
      progressPercent: 0,
      speedMbps: 250,
      etaSeconds: 300,
      status: 'syncing',
      source: 'Google Drive',
    };
    telemetryStore.syncJobs = [newJob, ...telemetryStore.syncJobs];
    notify();
  },

  async purgeCache(mediaId: string): Promise<boolean> {
    this.removeCachedMedia(mediaId);
    return true;
  },

  async cancelSyncJob(jobId: string): Promise<boolean> {
    telemetryStore.syncJobs = telemetryStore.syncJobs.filter((j) => j.id !== jobId);
    notify();
    return true;
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};
