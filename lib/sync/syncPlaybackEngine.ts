import { UserProfileId } from '@/types/cinema';
import {
  SyncPlaybackEventType,
  SyncPlaybackSession,
  SyncEventPayload,
  SyncActionNotification,
} from '@/types/syncPlayback';
import { QuickReactionEmoji } from '@/types/watchTogether';
import { PROFILES } from '@/lib/constants';
import { sendSyncPlayCommand, joinSyncPlayGroup } from '@/lib/api/syncPlay';

export interface SyncEngineCallbacks {
  onPlay?: (sender: UserProfileId, sequence: number) => void;
  onPause?: (sender: UserProfileId, sequence: number) => void;
  onSeek?: (position: number, sender: UserProfileId, sequence: number) => void;
  onSkipSegment?: (type: 'INTRO' | 'RECAP' | 'OUTRO', targetSeconds: number, sender: UserProfileId) => void;
  onNextEpisode?: (sender: UserProfileId) => void;
  onPrevEpisode?: (sender: UserProfileId) => void;
  onDriftCorrectRate?: (targetRate: number) => void;
  onNotification?: (notification: SyncActionNotification) => void;
  onSessionUpdate?: (session: SyncPlaybackSession) => void;
  onReaction?: (emoji: QuickReactionEmoji, sender: UserProfileId, senderName: string) => void;
}

export class SyncPlaybackEngine {
  private groupId: string;
  private mediaId: string;
  private localUserId: UserProfileId;
  private callbacks: SyncEngineCallbacks;

  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private socket: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private presenceTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private storageKey: string;
  private isDestroyed = false;
  private lastSeekCorrectionTime = 0;
  private lastReportedPosition = 0;
  private lastReportedState: 'PLAYING' | 'PAUSED' | 'BUFFERING' = 'PAUSED';

  private session: SyncPlaybackSession;

  constructor(
    groupId: string,
    mediaId: string,
    localUserId: UserProfileId,
    callbacks: SyncEngineCallbacks,
    groupName: string = 'Movie Night ❤️'
  ) {
    this.groupId = groupId;
    this.mediaId = mediaId;
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    this.storageKey = `dinustream_sync_session_${groupId}`;

    const userProfile = PROFILES[localUserId] || {
      id: localUserId,
      name: localUserId,
      avatarUrl: '/avatars/guest.svg',
    };

    // Initial session placeholder while connecting to server
    this.session = {
      groupId,
      groupName,
      mediaId,
      playbackState: 'PAUSED',
      position: 0,
      timestamp: Date.now(),
      controller: localUserId,
      sequence: 1,
      participants: {
        [localUserId]: {
          id: localUserId,
          name: userProfile.name || String(localUserId),
          avatarUrl: userProfile.avatarUrl || '/avatars/guest.svg',
          presence: 'Watching',
          lastSeen: Date.now(),
          position: 0,
        },
      },
    };

    this.initNetworking();
  }

  private initNetworking() {
    if (typeof window === 'undefined') return;

    // 1. Local BroadcastChannel for zero-latency cross-tab communication
    try {
      this.channel = new BroadcastChannel(`dinustream_sync_${this.groupId}`);
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'EVENT' && event.data?.event) {
          this.handleAuthoritativeEvent(event.data.event, event.data.session);
        } else if (event.data?.type === 'REACTION') {
          this.handleAuthoritativeEvent(event.data, this.session);
        }
      };
    } catch {
      // BroadcastChannel unavailable
    }

    // 2. Fetch authoritative initial state from DinuStream Sync Server
    this.fetchAuthoritativeState();

    // 3. Connect real-time event stream (SSE / WebSocket)
    this.connectRealtimeStream();

    // 4. Heartbeat interval to server (every 3.5 seconds)
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 3500);

    // 5. Presence liveness checker
    this.presenceTimer = setInterval(() => {
      this.checkPresenceLiveness();
    }, 5000);

    // Send JOIN command to server
    this.sendCommand({
      type: 'JOIN',
      groupId: this.groupId,
      sender: this.localUserId,
      mediaId: this.mediaId,
    });
  }

  private async fetchAuthoritativeState() {
    try {
      const res = await fetch(
        `/api/sync/playback?groupId=${encodeURIComponent(this.groupId)}&mediaId=${encodeURIComponent(
          this.mediaId
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          this.session = {
            ...data.session,
            // Calculate real expected position using server timestamp offset
            position: data.expectedPosition ?? data.session.position,
          };
          this.callbacks.onSessionUpdate?.({ ...this.session });
        }
      }
    } catch (err) {
      console.warn('[SYNC] Failed to fetch initial authoritative state:', err);
    }
  }

  private connectRealtimeStream() {
    if (this.isDestroyed || typeof window === 'undefined') return;

    // Clean up existing connections
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const sseUrl = `/api/sync/events?groupId=${encodeURIComponent(
        this.groupId
      )}&userId=${encodeURIComponent(this.localUserId)}`;
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      es.onopen = () => {
        console.log(`[SYNC] Real-time synchronization stream connected for group ${this.groupId}`);
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'INIT' && data.session) {
            this.handleServerInit(data.session, data.expectedPosition);
          } else if (data.type === 'EVENT' && data.event && data.session) {
            this.handleAuthoritativeEvent(data.event, data.session);
          }
        } catch (err) {
          console.warn('[SYNC] Failed to parse SSE message:', err);
        }
      };

      es.onerror = () => {
        console.warn('[SYNC] Real-time stream connection dropped. Reconnecting in 3s...');
        es.close();
        this.eventSource = null;
        if (!this.isDestroyed && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectRealtimeStream();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('[SYNC] Failed to create EventSource stream:', err);
    }
  }

  private handleServerInit(session: SyncPlaybackSession, expectedPosition?: number) {
    if (!session || session.groupId !== this.groupId) return;

    const initialPos = expectedPosition ?? session.position;
    this.session = {
      ...session,
      position: initialPos,
    };

    console.log(
      `[SYNC] Received server authoritative session: state=${session.playbackState} pos=${initialPos.toFixed(
        2
      )} seq=${session.sequence}`
    );

    this.callbacks.onSessionUpdate?.({ ...this.session });

    // Synchronize initial playback state
    if (session.playbackState === 'PLAYING') {
      this.callbacks.onPlay?.(session.controller, session.sequence);
      if (initialPos > 0) {
        this.callbacks.onSeek?.(initialPos, session.controller, session.sequence);
      }
    } else if (session.controller !== this.localUserId && (session.sequence > 1 || initialPos > 0)) {
      this.callbacks.onPause?.(session.controller, session.sequence);
      if (initialPos > 0) {
        this.callbacks.onSeek?.(initialPos, session.controller, session.sequence);
      }
    }
  }

  private handleAuthoritativeEvent(event: SyncEventPayload, updatedSession: SyncPlaybackSession) {
    if (!event || event.groupId !== this.groupId) return;

    const sender = event.controller;
    const isLocalSender = sender === this.localUserId;

    // Reject stale events
    if (
      event.sequence <= this.session.sequence &&
      event.type !== 'JOIN' &&
      event.type !== 'HEARTBEAT' &&
      event.type !== 'REACTION'
    ) {
      console.log(
        `[SYNC] Stale event rejected: eventSeq=${event.sequence} localSeq=${this.session.sequence} type=${event.type}`
      );
      return;
    }

    // Update authoritative local session copy
    this.session = {
      ...updatedSession,
      participants: { ...updatedSession.participants },
    };

    const senderName = PROFILES[sender]?.name || String(sender);

    // Handle reaction
    if (event.type === 'REACTION' && event.reactionEmoji) {
      this.callbacks.onReaction?.(
        event.reactionEmoji as QuickReactionEmoji,
        sender,
        senderName
      );
      return;
    }

    if (event.type === 'HEARTBEAT') {
      this.callbacks.onSessionUpdate?.({ ...this.session });
      return;
    }

    // Calculate current expected position accounting for transmission latency
    let targetPosition = event.position;
    if (event.playbackState === 'PLAYING') {
      const elapsed = (Date.now() - event.timestamp) / 1000;
      targetPosition = event.position + Math.max(0, elapsed);
    }

    console.log(
      `[SYNC] Executing authoritative event: ${event.type} seq=${event.sequence} pos=${targetPosition.toFixed(
        2
      )} sender=${sender}`
    );

    // Trigger player callbacks for non-local actions
    if (!isLocalSender) {
      switch (event.type) {
        case 'PLAY':
        case 'RESUME':
          this.callbacks.onPlay?.(sender, event.sequence);
          break;

        case 'PAUSE':
          this.callbacks.onPause?.(sender, event.sequence);
          break;

        case 'SEEK':
          this.callbacks.onSeek?.(targetPosition, sender, event.sequence);
          break;

        case 'SKIP_INTRO':
          this.callbacks.onSkipSegment?.('INTRO', targetPosition, sender);
          break;

        case 'SKIP_RECAP':
          this.callbacks.onSkipSegment?.('RECAP', targetPosition, sender);
          break;

        case 'SKIP_OUTRO':
          this.callbacks.onSkipSegment?.('OUTRO', targetPosition, sender);
          break;

        case 'NEXT_EPISODE':
          this.callbacks.onNextEpisode?.(sender);
          break;

        case 'PREVIOUS_EPISODE':
          this.callbacks.onPrevEpisode?.(sender);
          break;
      }
    }

    if (event.message) {
      const notif: SyncActionNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: event.type,
        sender,
        senderName,
        text: event.message,
        timestamp: Date.now(),
      };
      this.session.lastNotification = notif;
      this.callbacks.onNotification?.(notif);
    }

    this.persistLocalSession();
    this.callbacks.onSessionUpdate?.({ ...this.session });
  }

  /**
   * Server-authoritative drift correction with tiered thresholds and seek cooldown hysteresis.
   */
  public performDriftCorrection(localCurrentTime: number) {
    if (this.isDestroyed) return;

    // Do not correct drift if the local video is still starting up
    if (localCurrentTime < 1.0) {
      return;
    }

    // Calculate server-authoritative playhead position
    let authoritativePos = this.session.position;
    if (this.session.playbackState === 'PLAYING') {
      const elapsedSeconds = (Date.now() - this.session.timestamp) / 1000;
      authoritativePos += Math.max(0, elapsedSeconds);
    }

    const drift = localCurrentTime - authoritativePos;
    const absDrift = Math.abs(drift);

    // Tier 1: Drift < 250ms (0.25s) — In sync, ignore
    if (absDrift < 0.25) {
      this.callbacks.onDriftCorrectRate?.(1.0);
      return;
    }

    // Tier 2: Drift 250ms to 750ms (0.25s - 0.75s) — Smooth rate nudge (±4%)
    // Nudges playback rate without flushing buffers or stuttering
    if (absDrift >= 0.25 && absDrift < 0.75) {
      if (drift < 0) {
        // Behind: speed up slightly
        this.callbacks.onDriftCorrectRate?.(1.04);
      } else {
        // Ahead: slow down slightly
        this.callbacks.onDriftCorrectRate?.(0.96);
      }
      return;
    }

    // Tier 3: Drift > 750ms (0.75s) — Hard seek correction with 6-second cooldown hysteresis
    // Tier 4: Drift > 2000ms (2.0s) — Immediate forced sync
    const now = Date.now();
    const shouldForceSeek = absDrift >= 2.0;
    const cooldownElapsed = now - this.lastSeekCorrectionTime > 6000;

    if (absDrift >= 0.75 && (cooldownElapsed || shouldForceSeek)) {
      this.lastSeekCorrectionTime = now;
      this.callbacks.onDriftCorrectRate?.(1.0);

      console.log(
        `[SYNC_DRIFT] group=${this.groupId} user=${this.localUserId} expected=${authoritativePos.toFixed(
          2
        )} actual=${localCurrentTime.toFixed(2)} drift=${drift.toFixed(2)} action=CORRECT`
      );

      this.callbacks.onSeek?.(authoritativePos, this.session.controller, this.session.sequence);
    }
  }

  /**
   * Broadcast a user playback action by submitting it to the authoritative backend.
   */
  public broadcastEvent(
    type: SyncPlaybackEventType,
    position: number,
    playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING',
    options?: { customMessage?: string; episodeId?: string }
  ) {
    if (this.isDestroyed) return;

    this.lastReportedPosition = position;
    this.lastReportedState = playbackState;

    this.sendCommand({
      type,
      groupId: this.groupId,
      sender: this.localUserId,
      mediaId: this.mediaId,
      episodeId: options?.episodeId || this.session.episodeId,
      position,
      playbackState,
      message: options?.customMessage,
      clientTimestamp: Date.now(),
    });

    // Mirror to Jellyfin Native SyncPlay subsystem for server-side transcode alignment
    if (type === 'PLAY' || type === 'RESUME') {
      sendSyncPlayCommand(this.groupId, 'Play', position).catch(() => {});
    } else if (type === 'PAUSE') {
      sendSyncPlayCommand(this.groupId, 'Pause', position).catch(() => {});
    } else if (
      type === 'SEEK' ||
      type === 'SKIP_INTRO' ||
      type === 'SKIP_RECAP' ||
      type === 'SKIP_OUTRO'
    ) {
      sendSyncPlayCommand(this.groupId, 'Seek', position).catch(() => {});
    }
  }

  /**
   * Send a reaction emoji burst to the group.
   */
  public broadcastReaction(emoji: QuickReactionEmoji) {
    if (this.isDestroyed) return;

    this.sendCommand({
      type: 'REACTION',
      groupId: this.groupId,
      sender: this.localUserId,
      reactionEmoji: emoji,
      clientTimestamp: Date.now(),
    });
  }

  /**
   * Update participant playback telemetry (position, state, buffering).
   */
  public updateParticipantProgress(position: number, state: 'PLAYING' | 'PAUSED' | 'BUFFERING') {
    this.lastReportedPosition = position;
    this.lastReportedState = state;
  }

  /**
   * Set the room control mode (Host Only vs Everyone)
   */
  public setControlMode(mode: 'HOST_ONLY' | 'EVERYONE') {
    if (this.isDestroyed) return;
    this.sendCommand({
      type: 'CONTROL_MODE_CHANGE',
      groupId: this.groupId,
      sender: this.localUserId,
      controlMode: mode,
      clientTimestamp: Date.now(),
    });
  }

  private async sendCommand(cmd: Record<string, unknown>) {
    try {
      const res = await fetch('/api/sync/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.event && data.session) {
          // Broadcast to local BroadcastChannel for zero-latency peer tabs
          if (this.channel) {
            try {
              this.channel.postMessage({
                type: 'EVENT',
                event: data.event,
                session: data.session,
              });
            } catch {}
          }
          this.handleAuthoritativeEvent(data.event, data.session);
        } else if (!data.success && data.error) {
          this.callbacks.onNotification?.({
            id: `err-${Date.now()}`,
            type: 'PAUSE',
            sender: this.localUserId,
            senderName: 'System',
            text: data.error,
            timestamp: Date.now(),
          });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[SYNC] Command rejected by server:', errJson.error);
        if (errJson.error) {
          this.callbacks.onNotification?.({
            id: `err-${Date.now()}`,
            type: 'PAUSE',
            sender: this.localUserId,
            senderName: 'System',
            text: errJson.error,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.warn('[SYNC] Failed to send command to server:', err);
    }
  }

  private sendHeartbeat() {
    if (this.isDestroyed) return;

    fetch('/api/sync/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'HEARTBEAT',
        groupId: this.groupId,
        sender: this.localUserId,
        position: this.lastReportedPosition,
        playbackState: this.lastReportedState,
        clientTimestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  private checkPresenceLiveness() {
    if (this.isDestroyed) return;
    const now = Date.now();
    let changed = false;

    Object.values(this.session.participants).forEach((p) => {
      if (p.id !== this.localUserId && now - p.lastSeen > 8000) {
        if (p.presence !== 'Offline') {
          p.presence = 'Offline';
          changed = true;
        }
      }
    });

    if (changed) {
      this.callbacks.onSessionUpdate?.({ ...this.session });
    }
  }

  private persistLocalSession() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.session));
    } catch {}
  }

  public getSession(): SyncPlaybackSession {
    return { ...this.session };
  }

  public destroy() {
    this.isDestroyed = true;

    // Send LEAVE notification to server
    if (typeof window !== 'undefined') {
      navigator.sendBeacon?.(
        '/api/sync/playback',
        JSON.stringify({
          type: 'LEAVE',
          groupId: this.groupId,
          sender: this.localUserId,
        })
      );
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}
