import { MediaItem, MediaBadge, UserProfileId } from './cinema';

export type WatchGroupState =
  | 'CREATED'
  | 'WAITING'
  | 'SYNCING'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'ENDED';

export interface WatchGroupParticipant {
  id: UserProfileId;
  name: string;
  avatarUrl: string;
  isHost: boolean;
  isOnline: boolean;
  isReady: boolean;
  playbackPositionSeconds?: number;
  syncLatencyMs?: number;
  statusText?: string;
}

export interface WatchGroupSyncProgress {
  state: 'not_cached' | 'starting' | 'syncing' | 'ready' | 'error';
  percent: number;
  transferredBytes?: number;
  totalBytes?: number;
  speed: string;
  eta: string;
  currentStep: 'Google Drive' | 'Oracle SSD' | 'Ready' | 'Idle';
}

export type QuickReactionEmoji = '❤️' | '😂' | '😭' | '😱' | '🔥' | '👏';

export interface FloatingReactionEvent {
  id: string;
  emoji: QuickReactionEmoji;
  senderId: UserProfileId;
  senderName: string;
  timestamp: number;
  xOffsetPercent: number;
}

export interface QueuedMovie {
  id: string;
  movieId: string;
  title: string;
  runtime: string;
  posterUrl: string;
  backdropUrl?: string;
  badges: MediaBadge[];
  addedBy: UserProfileId;
  addedByName: string;
  addedAt: number;
}

export interface WatchGroup {
  id: string;
  name: string;
  state: WatchGroupState;
  hostId: UserProfileId;
  participants: WatchGroupParticipant[];
  selectedMovie: MediaItem | null;
  queue: QueuedMovie[];
  syncProgress: WatchGroupSyncProgress;
  currentPositionSeconds: number;
  isPlaying: boolean;
  createdAt: string;
  jellyfinSyncPlayGroupId?: string;
}
