import { UserProfileId } from '@/types/cinema';
import {
  SyncPlaybackEventType,
  SyncPlaybackSession,
  SyncEventPayload,
  SyncActionNotification,
} from '@/types/syncPlayback';
import { PROFILES } from '@/lib/constants';

export interface SyncCommand {
  type: SyncPlaybackEventType;
  groupId: string;
  sender: UserProfileId;
  mediaId?: string;
  episodeId?: string;
  position?: number;
  playbackState?: 'PLAYING' | 'PAUSED' | 'BUFFERING';
  message?: string;
  reactionEmoji?: string;
  latencyMs?: number;
  clientTimestamp?: number;
}

export interface SyncCommandResult {
  success: boolean;
  session: SyncPlaybackSession;
  event?: SyncEventPayload;
  error?: string;
}

type GroupEventListener = (event: SyncEventPayload, session: SyncPlaybackSession) => void;

class SyncServerEngine {
  private sessions: Map<string, SyncPlaybackSession> = new Map();
  private listeners: Map<string, Set<GroupEventListener>> = new Map();

  /**
   * Get or initialize an authoritative SyncPlaybackSession for a group.
   */
  public getSession(
    groupId: string,
    initialMediaId: string = 'movie-1',
    initialGroupName: string = 'Movie Night ❤️'
  ): SyncPlaybackSession {
    let session = this.sessions.get(groupId);
    if (!session) {
      session = {
        groupId,
        groupName: initialGroupName,
        mediaId: initialMediaId,
        playbackState: 'PAUSED',
        position: 0,
        timestamp: Date.now(),
        controller: 'dinu',
        sequence: 1,
        participants: {
          dinu: {
            id: 'dinu',
            name: PROFILES.dinu?.name || 'Dinu',
            avatarUrl: PROFILES.dinu?.avatarUrl || '/avatars/dinu.svg',
            presence: 'Online',
            lastSeen: Date.now(),
            position: 0,
          },
          kanmani: {
            id: 'kanmani',
            name: PROFILES.kanmani?.name || 'Kanmani',
            avatarUrl: PROFILES.kanmani?.avatarUrl || '/avatars/kanmani.svg',
            presence: 'Online',
            lastSeen: Date.now(),
            position: 0,
          },
        },
      };
      this.sessions.set(groupId, session);
    }
    return { ...session, participants: { ...session.participants } };
  }

  /**
   * Calculate expected position for a session accounting for server clock progression.
   */
  public getExpectedPosition(session: SyncPlaybackSession, serverNow: number = Date.now()): number {
    if (session.playbackState === 'PLAYING') {
      const elapsedSeconds = (serverNow - session.timestamp) / 1000;
      return Math.max(0, session.position + elapsedSeconds);
    }
    return session.position;
  }

  /**
   * Subscribe to server-authoritative events for a given group.
   */
  public subscribe(groupId: string, listener: GroupEventListener): () => void {
    if (!this.listeners.has(groupId)) {
      this.listeners.set(groupId, new Set());
    }
    this.listeners.get(groupId)!.add(listener);

    return () => {
      const groupListeners = this.listeners.get(groupId);
      if (groupListeners) {
        groupListeners.delete(listener);
        if (groupListeners.size === 0) {
          this.listeners.delete(groupId);
        }
      }
    };
  }

  /**
   * Execute an incoming playback or presence command on the authoritative server session.
   */
  public handleCommand(cmd: SyncCommand): SyncCommandResult {
    const serverNow = Date.now();
    const { groupId, sender, type } = cmd;

    if (!groupId) {
      return {
        success: false,
        session: this.getSession('default'),
        error: 'Missing groupId parameter',
      };
    }

    // Authenticate sender
    if (!['dinu', 'kanmani'].includes(sender) && !PROFILES[sender]) {
      console.warn(`[SYNC] Rejected command from unauthenticated user: ${sender}`);
      return {
        success: false,
        session: this.getSession(groupId),
        error: 'Unauthorized participant profile',
      };
    }

    const session = this.getSession(groupId, cmd.mediaId);
    const senderName = PROFILES[sender]?.name || String(sender);

    // Ensure participant entry exists
    if (!session.participants[sender]) {
      const pProfile = PROFILES[sender];
      session.participants[sender] = {
        id: sender,
        name: senderName,
        avatarUrl: pProfile?.avatarUrl || '/avatars/guest.svg',
        presence: 'Watching',
        lastSeen: serverNow,
        position: cmd.position || 0,
      };
    } else {
      session.participants[sender].lastSeen = serverNow;
      if (typeof cmd.position === 'number') {
        session.participants[sender].position = cmd.position;
      }
    }

    // Handle HEARTBEAT: strictly updates participant presence/position without altering group playback
    if (type === 'HEARTBEAT') {
      const participantPresence =
        cmd.playbackState === 'BUFFERING'
          ? 'Buffering'
          : cmd.playbackState === 'PLAYING'
          ? 'Watching'
          : 'Paused';

      session.participants[sender].presence = participantPresence;
      if (typeof cmd.position === 'number') {
        session.participants[sender].position = cmd.position;
      }
      if (typeof cmd.latencyMs === 'number') {
        session.participants[sender].latencyMs = cmd.latencyMs;
      }

      this.sessions.set(groupId, session);
      return { success: true, session: { ...session } };
    }

    // Handle REACTION
    if (type === 'REACTION' && cmd.reactionEmoji) {
      const payload: SyncEventPayload = {
        type: 'REACTION',
        groupId,
        mediaId: session.mediaId,
        episodeId: session.episodeId,
        position: this.getExpectedPosition(session, serverNow),
        playbackState: session.playbackState,
        controller: sender,
        sequence: session.sequence,
        timestamp: serverNow,
        reactionEmoji: cmd.reactionEmoji,
      };

      this.broadcast(groupId, payload, session);
      return { success: true, session: { ...session }, event: payload };
    }

    // Handle JOIN
    if (type === 'JOIN') {
      session.participants[sender].presence = 'Watching';
      const joinMsg = cmd.message || `${senderName} joined the screening room`;

      const notif: SyncActionNotification = {
        id: `notif-${serverNow}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'JOIN',
        sender,
        senderName,
        text: joinMsg,
        timestamp: serverNow,
      };
      session.lastNotification = notif;

      const payload: SyncEventPayload = {
        type: 'JOIN',
        groupId,
        mediaId: session.mediaId,
        episodeId: session.episodeId,
        position: this.getExpectedPosition(session, serverNow),
        playbackState: session.playbackState,
        controller: session.controller,
        sequence: session.sequence,
        timestamp: serverNow,
        message: joinMsg,
      };

      this.sessions.set(groupId, session);
      this.broadcast(groupId, payload, session);
      return { success: true, session: { ...session }, event: payload };
    }

    // Handle LEAVE
    if (type === 'LEAVE') {
      session.participants[sender].presence = 'Offline';
      const leaveMsg = cmd.message || `${senderName} left the screening room`;

      const payload: SyncEventPayload = {
        type: 'LEAVE',
        groupId,
        mediaId: session.mediaId,
        episodeId: session.episodeId,
        position: this.getExpectedPosition(session, serverNow),
        playbackState: session.playbackState,
        controller: session.controller,
        sequence: session.sequence,
        timestamp: serverNow,
        message: leaveMsg,
      };

      this.sessions.set(groupId, session);
      this.broadcast(groupId, payload, session);
      return { success: true, session: { ...session }, event: payload };
    }

    // State-changing playback actions: Increment server sequence and set authoritative timestamp
    session.sequence += 1;
    session.timestamp = serverNow;
    session.controller = sender;

    if (cmd.mediaId && cmd.mediaId !== session.mediaId) {
      session.mediaId = cmd.mediaId;
      session.position = 0;
    }
    if (cmd.episodeId) {
      session.episodeId = cmd.episodeId;
    }

    let defaultMsg = '';

    switch (type) {
      case 'PLAY':
      case 'RESUME':
        session.playbackState = 'PLAYING';
        if (typeof cmd.position === 'number') {
          session.position = Math.max(0, cmd.position);
        }
        defaultMsg = `${senderName} resumed playback`;
        break;

      case 'PAUSE':
        session.playbackState = 'PAUSED';
        if (typeof cmd.position === 'number') {
          session.position = Math.max(0, cmd.position);
        } else {
          session.position = this.getExpectedPosition(session, serverNow);
        }
        defaultMsg = `${senderName} paused playback`;
        break;

      case 'SEEK':
        session.position = Math.max(0, cmd.position ?? 0);
        defaultMsg = `${senderName} sought to ${Math.round(session.position)}s`;
        break;

      case 'SKIP_INTRO':
        session.position = Math.max(0, cmd.position ?? 0);
        defaultMsg = `${senderName} skipped intro`;
        break;

      case 'SKIP_RECAP':
        session.position = Math.max(0, cmd.position ?? 0);
        defaultMsg = `${senderName} skipped recap`;
        break;

      case 'SKIP_OUTRO':
        session.position = Math.max(0, cmd.position ?? 0);
        defaultMsg = `${senderName} skipped outro`;
        break;

      case 'NEXT_EPISODE':
        session.position = 0;
        session.playbackState = 'PLAYING';
        defaultMsg = `${senderName} played next episode`;
        break;

      case 'PREVIOUS_EPISODE':
        session.position = 0;
        session.playbackState = 'PLAYING';
        defaultMsg = `${senderName} played previous episode`;
        break;
    }

    const finalMsg = cmd.message || defaultMsg;
    if (finalMsg) {
      const notif: SyncActionNotification = {
        id: `notif-${serverNow}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        sender,
        senderName,
        text: finalMsg,
        timestamp: serverNow,
      };
      session.lastNotification = notif;
    }

    const payload: SyncEventPayload = {
      type,
      groupId,
      mediaId: session.mediaId,
      episodeId: session.episodeId,
      position: session.position,
      playbackState: session.playbackState,
      controller: sender,
      sequence: session.sequence,
      timestamp: session.timestamp,
      message: finalMsg,
    };

    // Structured Server Logging
    console.log(
      `[SYNC] group=${groupId} user=${sender} event=${type} seq=${session.sequence} position=${session.position.toFixed(
        2
      )} state=${session.playbackState} serverTimestamp=${serverNow} clientTimestamp=${cmd.clientTimestamp || 0}`
    );

    this.sessions.set(groupId, session);
    this.broadcast(groupId, payload, session);

    return { success: true, session: { ...session }, event: payload };
  }

  private broadcast(groupId: string, event: SyncEventPayload, session: SyncPlaybackSession) {
    const notifyList = new Set<GroupEventListener>();
    const groupListeners = this.listeners.get(groupId);
    if (groupListeners) groupListeners.forEach((l) => notifyList.add(l));
    const allListeners = this.listeners.get('*');
    if (allListeners) allListeners.forEach((l) => notifyList.add(l));

    notifyList.forEach((listener) => {
      try {
        listener(event, session);
      } catch (err) {
        console.error(`[SYNC] Error in group listener for ${groupId}:`, err);
      }
    });
  }
}

// Global server singleton across API routes and websocket server
const globalForSync = globalThis as unknown as { syncServerEngine?: SyncServerEngine };
export const syncServerEngine = globalForSync.syncServerEngine || new SyncServerEngine();
if (process.env.NODE_ENV !== 'production') {
  globalForSync.syncServerEngine = syncServerEngine;
}
