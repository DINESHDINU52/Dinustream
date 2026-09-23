import { UserProfileId } from './cinema';

export type SyncPlaybackEventType =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'RESUME'
  | 'SKIP_INTRO'
  | 'SKIP_RECAP'
  | 'SKIP_OUTRO'
  | 'NEXT_EPISODE'
  | 'PREVIOUS_EPISODE'
  | 'JOIN'
  | 'LEAVE'
  | 'HEARTBEAT'
  | 'REACTION'
  | 'CONTROL_MODE_CHANGE';

export type ParticipantPresence =
  | 'Online'
  | 'Watching'
  | 'Paused'
  | 'Buffering'
  | 'Offline';

export interface SyncParticipantState {
  id: UserProfileId;
  name: string;
  avatarUrl: string;
  presence: ParticipantPresence;
  lastSeen: number; // epoch ms
  position: number; // seconds
  latencyMs?: number;
  isHost?: boolean;
}

export interface SyncActionNotification {
  id: string;
  type: SyncPlaybackEventType;
  sender: UserProfileId;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface SyncPlaybackSession {
  groupId: string;
  groupName: string;
  mediaId: string;
  episodeId?: string;
  playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING';
  position: number; // seconds
  timestamp: number; // epoch ms when position was recorded
  controller: UserProfileId;
  sequence: number; // monotonically increasing sequence number
  participants: Record<string, SyncParticipantState>;
  lastNotification?: SyncActionNotification;
  hostId?: string;
  controlMode?: 'HOST_ONLY' | 'EVERYONE';
}

export interface SyncEventPayload {
  type: SyncPlaybackEventType;
  groupId: string;
  mediaId: string;
  episodeId?: string;
  position: number;
  playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING';
  controller: UserProfileId;
  sequence: number;
  timestamp: number;
  message?: string;
  reactionEmoji?: string;
  controlMode?: 'HOST_ONLY' | 'EVERYONE';
}
