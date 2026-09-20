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
  | 'HEARTBEAT'
  | 'REACTION';

export type ParticipantPresence =
  | 'Online'
  | 'Watching'
  | 'Paused'
  | 'Buffering'
  | 'Offline';

export interface SyncParticipantState {
  id: 'dinu' | 'kanmani';
  name: string;
  avatarUrl: string;
  presence: ParticipantPresence;
  lastSeen: number; // epoch ms
  position: number; // seconds
}

export interface SyncActionNotification {
  id: string;
  type: SyncPlaybackEventType;
  sender: 'dinu' | 'kanmani';
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
  controller: 'dinu' | 'kanmani';
  sequence: number; // monotonically increasing sequence number
  participants: {
    dinu: SyncParticipantState;
    kanmani: SyncParticipantState;
  };
  lastNotification?: SyncActionNotification;
}

export interface SyncEventPayload {
  type: SyncPlaybackEventType;
  groupId: string;
  mediaId: string;
  episodeId?: string;
  position: number;
  playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING';
  controller: 'dinu' | 'kanmani';
  sequence: number;
  timestamp: number;
  message?: string;
  reactionEmoji?: string;
}
