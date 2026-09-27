'use client';

import {
  AdminTelemetrySummary,
  CachedMedia,
  SyncJob,
  SSDStorageMetrics,
  ActivePlaybackTelemetry,
} from '@/types/admin';
import { MOCK_ADMIN_TELEMETRY } from '@/lib/mock-data';

let telemetryStore: AdminTelemetrySummary = { ...MOCK_ADMIN_TELEMETRY };
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
