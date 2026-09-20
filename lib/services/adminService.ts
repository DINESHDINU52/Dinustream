'use client';

import {
  AdminTelemetrySummary,
  CachedMedia,
  SyncJob,
  SSDStorageMetrics,
  ServiceTelemetry,
  ActivePlaybackTelemetry,
} from '@/types/admin';

const INITIAL_STORAGE: SSDStorageMetrics = {
  totalGb: 2048,
  usedGb: 1380,
  freeGb: 668,
  usedPercentage: 67.4,
  breakdown: {
    moviesGb: 890,
    seriesGb: 380,
    spatialAudioGb: 45,
    systemBufferGb: 65,
  },
};

const INITIAL_SERVICES = {
  jellyfin: {
    name: 'Jellyfin Media Engine',
    status: 'healthy' as const,
    latencyMs: 18,
    uptime: '99.98% (42 days)',
    details: 'v10.9.8 • Direct Play Enabled • NVENC Active',
    endpoint: 'oracle-cluster-01.dinustream.internal:8096',
    lastChecked: 'Just now',
  },
  syncManager: {
    name: 'Oracle NVMe Sync Manager',
    status: 'healthy' as const,
    latencyMs: 8,
    uptime: '100% (18 days)',
    details: '4 Worker Threads • NVMe SSD Direct I/O',
    endpoint: 'oracle-ssd-srv.internal:5000',
    lastChecked: 'Just now',
  },
  googleDrive: {
    name: 'Google Drive Upstream',
    status: 'healthy' as const,
    latencyMs: 64,
    uptime: '99.95%',
    details: 'API Quota: 86% Free • Service Account Authenticated',
    endpoint: 'gdrive-vault.dinustream.internal',
    lastChecked: 'Just now',
  },
  firebase: {
    name: 'Firebase Realtime Core',
    status: 'healthy' as const,
    latencyMs: 28,
    uptime: '100%',
    details: 'SyncPlay Channel Active • 2 Connected Clients',
    endpoint: 'dinustream-cinema.firebaseio.com',
    lastChecked: 'Just now',
  },
};

const INITIAL_CACHED_MEDIA: CachedMedia[] = [
  {
    id: 'movie-01',
    title: 'Dune: Part Two',
    mediaType: 'movie',
    sizeGb: 64.8,
    resolution: '4K UHD (2160p)',
    audioFormat: 'Dolby Atmos (TrueHD 7.1)',
    cachedAt: '2026-09-18 20:14',
    lastAccessed: '2 minutes ago',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    cacheLocation: '/mnt/oracle-nvme/movies/Dune.Part.Two.2024.2160p.mkv',
  },
  {
    id: 'movie-02',
    title: 'Interstellar: IMAX Special Edition',
    mediaType: 'movie',
    sizeGb: 72.4,
    resolution: '4K UHD (2160p)',
    audioFormat: 'DTS-HD MA 5.1 / Atmos',
    cachedAt: '2026-09-15 14:22',
    lastAccessed: '1 day ago',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    cacheLocation: '/mnt/oracle-nvme/movies/Interstellar.2014.IMAX.2160p.mkv',
  },
  {
    id: 'series-01',
    title: 'Severance (Season 1)',
    mediaType: 'series',
    sizeGb: 98.2,
    resolution: '4K HDR',
    audioFormat: 'Dolby Atmos (Spatial)',
    cachedAt: '2026-09-16 11:05',
    lastAccessed: '3 hours ago',
    posterUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
    cacheLocation: '/mnt/oracle-nvme/series/Severance.S01/',
  },
  {
    id: 'music-01',
    title: 'Hans Zimmer: Dune Sketchbook (Spatial Atmos)',
    mediaType: 'music',
    sizeGb: 8.6,
    resolution: 'Lossless Hi-Res',
    audioFormat: 'Dolby Atmos (24-bit/48kHz)',
    cachedAt: '2026-09-19 09:30',
    lastAccessed: '45 minutes ago',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    cacheLocation: '/mnt/oracle-nvme/audio/Hans.Zimmer.Dune.Sketchbook.flac',
  },
  {
    id: 'movie-03',
    title: 'Blade Runner 2049',
    mediaType: 'movie',
    sizeGb: 58.3,
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    cachedAt: '2026-09-12 18:40',
    lastAccessed: '4 days ago',
    posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=80',
    cacheLocation: '/mnt/oracle-nvme/movies/Blade.Runner.2049.2160p.mkv',
  },
];

const INITIAL_SYNC_JOBS: SyncJob[] = [
  {
    id: 'sync-job-101',
    mediaId: 'movie-oppenheimer',
    title: 'Oppenheimer (2023) - 4K UHD IMAX',
    fileSizeGb: 78.4,
    transferredGb: 54.2,
    progressPercent: 69.1,
    speedMbps: 284.5,
    etaSeconds: 420,
    status: 'syncing',
    startedAt: '2026-09-20 16:42',
    source: 'Google Drive',
  },
  {
    id: 'sync-job-102',
    mediaId: 'series-shogun',
    title: 'Shōgun (Season 1) - Complete',
    fileSizeGb: 84.0,
    transferredGb: 0,
    progressPercent: 0,
    speedMbps: 0,
    etaSeconds: 1650,
    status: 'queued',
    startedAt: '2026-09-20 16:50',
    source: 'Google Drive',
  },
  {
    id: 'sync-job-103',
    mediaId: 'movie-01',
    title: 'Dune: Part Two (2024)',
    fileSizeGb: 64.8,
    transferredGb: 64.8,
    progressPercent: 100,
    speedMbps: 310.2,
    etaSeconds: 0,
    status: 'completed',
    startedAt: '2026-09-18 19:40',
    completedAt: '2026-09-18 20:14',
    source: 'Google Drive',
  },
  {
    id: 'sync-job-104',
    mediaId: 'movie-civil-war',
    title: 'Civil War (2024) - 4K HDR',
    fileSizeGb: 46.2,
    transferredGb: 12.1,
    progressPercent: 26.2,
    speedMbps: 0,
    etaSeconds: 0,
    status: 'failed',
    startedAt: '2026-09-19 22:10',
    error: 'Google Drive API timeout during chunk 18. Auto-retry pending.',
    source: 'Google Drive',
  },
];

const INITIAL_LIVE_PLAYBACK: ActivePlaybackTelemetry = {
  groupId: 'group-movie-night',
  groupName: 'Movie Night ❤️',
  mediaId: 'movie-01',
  title: 'Dune: Part Two',
  posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  currentTimeSec: 4120, // 1h 08m 40s
  durationSec: 9960, // 2h 46m
  isPlaying: true,
  bitrateMbps: 68.4,
  resolution: '3840x2160 (4K UHD)',
  audioTrack: 'Dolby Atmos (TrueHD 7.1)',
  syncPlaySynced: true,
  participants: [
    {
      id: 'dinu',
      name: 'Dinu',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      status: 'watching',
      currentPositionSec: 4120,
      driftMs: 0,
      device: 'MacBook Pro Cinema Suite (Chrome)',
    },
    {
      id: 'kanmani',
      name: 'Kanmani',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      status: 'watching',
      currentPositionSec: 4120,
      driftMs: 8,
      device: 'iPad Pro OLED (Safari)',
    },
  ],
};

class AdminService {
  private services = { ...INITIAL_SERVICES };
  private storage = { ...INITIAL_STORAGE };
  private cachedMedia = [...INITIAL_CACHED_MEDIA];
  private syncJobs = [...INITIAL_SYNC_JOBS];
  private livePlayback: ActivePlaybackTelemetry | null = { ...INITIAL_LIVE_PLAYBACK };
  private subscribers: Array<() => void> = [];

  constructor() {
    // Periodically update active sync job progress for authentic telemetry
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.tickSyncProgress();
      }, 3000);
    }
  }

  private tickSyncProgress() {
    let updated = false;
    this.syncJobs = this.syncJobs.map((job) => {
      if (job.status === 'syncing') {
        const increment = 1.2;
        const nextTransferred = Math.min(job.fileSizeGb, job.transferredGb + increment);
        const nextPercent = Math.min(100, (nextTransferred / job.fileSizeGb) * 100);
        const nextEta = Math.max(0, job.etaSeconds - 12);

        if (nextPercent >= 100) {
          updated = true;
          return {
            ...job,
            transferredGb: job.fileSizeGb,
            progressPercent: 100,
            status: 'completed' as const,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            etaSeconds: 0,
          };
        }

        updated = true;
        return {
          ...job,
          transferredGb: Number(nextTransferred.toFixed(1)),
          progressPercent: Number(nextPercent.toFixed(1)),
          etaSeconds: nextEta,
        };
      }
      return job;
    });

    if (updated) {
      this.notify();
    }
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public getTelemetry(): AdminTelemetrySummary {
    return {
      jellyfin: this.services.jellyfin,
      syncManager: this.services.syncManager,
      googleDrive: this.services.googleDrive,
      firebase: this.services.firebase,
      storage: { ...this.storage },
      cachedMedia: [...this.cachedMedia],
      syncJobs: [...this.syncJobs],
      livePlayback: this.livePlayback ? { ...this.livePlayback } : null,
    };
  }

  public removeCachedMedia(id: string): boolean {
    const item = this.cachedMedia.find((m) => m.id === id);
    if (!item) return false;

    this.cachedMedia = this.cachedMedia.filter((m) => m.id !== id);

    // Free up storage
    const freedGb = item.sizeGb;
    const newUsed = Math.max(0, Number((this.storage.usedGb - freedGb).toFixed(1)));
    const newFree = Number((this.storage.totalGb - newUsed).toFixed(1));
    const newPercent = Number(((newUsed / this.storage.totalGb) * 100).toFixed(1));

    this.storage = {
      ...this.storage,
      usedGb: newUsed,
      freeGb: newFree,
      usedPercentage: newPercent,
      breakdown: {
        ...this.storage.breakdown,
        moviesGb: Math.max(0, Number((this.storage.breakdown.moviesGb - freedGb).toFixed(1))),
      },
    };

    this.notify();
    return true;
  }

  public retrySyncJob(jobId: string): void {
    this.syncJobs = this.syncJobs.map((job) => {
      if (job.id === jobId) {
        return {
          ...job,
          status: 'syncing',
          error: undefined,
          speedMbps: 295.4,
          etaSeconds: Math.round(((job.fileSizeGb - job.transferredGb) * 1024 * 8) / 295.4),
        };
      }
      return job;
    });
    this.notify();
  }

  public queueNewSync(title: string, sizeGb: number): void {
    const newJob: SyncJob = {
      id: `sync-job-${Date.now()}`,
      mediaId: `custom-${Date.now()}`,
      title,
      fileSizeGb: sizeGb,
      transferredGb: 0,
      progressPercent: 0,
      speedMbps: 0,
      etaSeconds: Math.round((sizeGb * 1024 * 8) / 300),
      status: 'queued',
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'Google Drive',
    };
    this.syncJobs.unshift(newJob);
    this.notify();
  }
}

export const adminService = new AdminService();
