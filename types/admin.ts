export type ServiceHealth = 'healthy' | 'degraded' | 'offline' | 'syncing';

export interface ServiceTelemetry {
  name: string;
  status: ServiceHealth;
  latencyMs: number;
  uptime: string;
  details: string;
  endpoint?: string;
  lastChecked: string;
}

export interface SSDStorageMetrics {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usedPercentage: number;
  breakdown: {
    moviesGb: number;
    seriesGb: number;
    spatialAudioGb: number;
    systemBufferGb: number;
  };
}

export interface CachedMedia {
  id: string;
  title: string;
  mediaType: 'movie' | 'series' | 'episode' | 'music';
  sizeGb: number;
  resolution: string;
  audioFormat: string;
  cachedAt: string;
  lastAccessed: string;
  posterUrl: string;
  cacheLocation: string;
}

export type SyncJobStatus = 'queued' | 'syncing' | 'completed' | 'failed';

export interface SyncJob {
  id: string;
  mediaId: string;
  title: string;
  fileSizeGb: number;
  transferredGb: number;
  progressPercent: number;
  speedMbps: number;
  etaSeconds: number;
  status: SyncJobStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  source: 'Google Drive' | 'Oracle Cloud' | 'Jellyfin Remote';
}

export interface ActiveParticipantInfo {
  id: 'dinu' | 'kanmani';
  name: string;
  avatarUrl: string;
  status: 'watching' | 'paused' | 'buffering' | 'idle';
  currentPositionSec: number;
  driftMs: number;
  device: string;
}

export interface ActivePlaybackTelemetry {
  groupId: string;
  groupName: string;
  mediaId: string;
  title: string;
  posterUrl: string;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  bitrateMbps: number;
  resolution: string;
  audioTrack: string;
  participants: ActiveParticipantInfo[];
  syncPlaySynced: boolean;
}

export interface AdminTelemetrySummary {
  jellyfin: ServiceTelemetry;
  syncManager: ServiceTelemetry;
  googleDrive: ServiceTelemetry;
  firebase: ServiceTelemetry;
  storage: SSDStorageMetrics;
  cachedMedia: CachedMedia[];
  syncJobs: SyncJob[];
  livePlayback: ActivePlaybackTelemetry | null;
}
