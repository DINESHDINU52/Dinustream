import {
  SyncPlaybackEventType,
  SyncPlaybackSession,
  SyncEventPayload,
  SyncActionNotification,
} from '@/types/syncPlayback';

import { QuickReactionEmoji } from '@/types/watchTogether';

export interface SyncEngineCallbacks {
  onPlay?: (sender: 'dinu' | 'kanmani', sequence: number) => void;
  onPause?: (sender: 'dinu' | 'kanmani', sequence: number) => void;
  onSeek?: (position: number, sender: 'dinu' | 'kanmani', sequence: number) => void;
  onSkipSegment?: (type: 'INTRO' | 'RECAP' | 'OUTRO', targetSeconds: number, sender: 'dinu' | 'kanmani') => void;
  onNextEpisode?: (sender: 'dinu' | 'kanmani') => void;
  onPrevEpisode?: (sender: 'dinu' | 'kanmani') => void;
  onDriftCorrectRate?: (targetRate: number) => void;
  onNotification?: (notification: SyncActionNotification) => void;
  onSessionUpdate?: (session: SyncPlaybackSession) => void;
  onReaction?: (emoji: QuickReactionEmoji, sender: 'dinu' | 'kanmani', senderName: string) => void;
}

export class SyncPlaybackEngine {
  private groupId: string;
  private mediaId: string;
  private localUserId: 'dinu' | 'kanmani';
  private callbacks: SyncEngineCallbacks;
  private channel: BroadcastChannel | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private presenceTimer: NodeJS.Timeout | null = null;
  private driftCheckTimer: NodeJS.Timeout | null = null;
  private storageKey: string;
  private isDestroyed = false;

  private session: SyncPlaybackSession;

  constructor(
    groupId: string,
    mediaId: string,
    localUserId: 'dinu' | 'kanmani',
    callbacks: SyncEngineCallbacks,
    groupName: string = 'Movie Night ❤️'
  ) {
    this.groupId = groupId;
    this.mediaId = mediaId;
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    this.storageKey = `dinustream_sync_session_${groupId}`;

    // Initialize session state
    const initialSession: SyncPlaybackSession = {
      groupId,
      groupName,
      mediaId,
      playbackState: 'PAUSED',
      position: 0,
      timestamp: Date.now(),
      controller: localUserId,
      sequence: 1,
      participants: {
        dinu: {
          id: 'dinu',
          name: 'Dinu',
          avatarUrl: '/avatars/dinu.png',
          presence: localUserId === 'dinu' ? 'Watching' : 'Online',
          lastSeen: Date.now(),
          position: 0,
        },
        kanmani: {
          id: 'kanmani',
          name: 'Kanmani',
          avatarUrl: '/avatars/kanmani.png',
          presence: localUserId === 'kanmani' ? 'Watching' : 'Online',
          lastSeen: Date.now(),
          position: 0,
        },
      },
    };

    // Attempt to load existing session from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.groupId === groupId) {
            initialSession.sequence = parsed.sequence || 1;
            initialSession.position = parsed.position || 0;
            initialSession.playbackState = parsed.playbackState || 'PAUSED';
            initialSession.groupName = parsed.groupName || groupName;
          }
        }
      } catch {
        // Fall back to initialSession
      }
    }

    this.session = initialSession;
    this.initNetworking();
  }

  private initNetworking() {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel for instant real-time sync across tabs/windows
    try {
      this.channel = new BroadcastChannel(`dinustream_sync_${this.groupId}`);
      this.channel.onmessage = (event) => {
        this.handleIncomingPayload(event.data);
      };
    } catch {
      // Fallback to storage event
    }

    // 2. Storage event listener fallback
    window.addEventListener('storage', this.handleStorageEvent);

    // 3. Heartbeat interval
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 2000);

    // 4. Presence checker (mark stale participants offline)
    this.presenceTimer = setInterval(() => {
      this.checkPresenceLiveness();
    }, 4000);

    // Announce JOIN event
    this.broadcastEvent('JOIN', this.session.position, this.session.playbackState, {
      customMessage: `${this.getLocalUserName()} joined`,
    });
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === this.storageKey && e.newValue) {
      try {
        const payload: SyncEventPayload = JSON.parse(e.newValue);
        this.handleIncomingPayload(payload);
      } catch {
        // ignore
      }
    }
  };

  private handleIncomingPayload(payload: SyncEventPayload) {
    if (!payload || payload.groupId !== this.groupId) return;
    if (payload.controller === this.localUserId && payload.type !== 'HEARTBEAT') {
      // Echo from own client, ignore
      return;
    }

    const sender = payload.controller;
    const senderName = sender === 'dinu' ? 'Dinu' : 'Kanmani';

    // Update participant presence & position
    if (this.session.participants[sender]) {
      this.session.participants[sender].lastSeen = Date.now();
      this.session.participants[sender].position = payload.position;
      this.session.participants[sender].presence =
        payload.playbackState === 'PLAYING'
          ? 'Watching'
          : payload.playbackState === 'BUFFERING'
          ? 'Buffering'
          : 'Paused';
    }

    // Process authoritative events with sequence check
    const isHigherSequence = payload.sequence >= this.session.sequence;

    if (payload.type === 'HEARTBEAT') {
      // Only update presence metadata
      this.callbacks.onSessionUpdate?.({ ...this.session });
      return;
    }

    if (payload.type === 'REACTION' && payload.reactionEmoji) {
      this.callbacks.onReaction?.(
        payload.reactionEmoji as QuickReactionEmoji,
        sender,
        senderName
      );
      return;
    }

    // Handle discrete playback actions
    if (isHigherSequence || payload.type === 'SEEK' || payload.type.startsWith('SKIP_')) {
      this.session.sequence = Math.max(this.session.sequence, payload.sequence);
      this.session.position = payload.position;
      this.session.timestamp = payload.timestamp;
      this.session.playbackState = payload.playbackState;
      this.session.controller = payload.controller;

      let notificationText = payload.message || '';

      switch (payload.type) {
        case 'PLAY':
        case 'RESUME':
          notificationText = notificationText || `${senderName} resumed playback`;
          this.callbacks.onPlay?.(sender, payload.sequence);
          break;

        case 'PAUSE':
          notificationText = notificationText || `${senderName} paused playback`;
          this.callbacks.onPause?.(sender, payload.sequence);
          break;

        case 'SEEK':
          notificationText = notificationText || `${senderName} seeked`;
          this.callbacks.onSeek?.(payload.position, sender, payload.sequence);
          break;

        case 'SKIP_INTRO':
          notificationText = `${senderName} skipped intro`;
          this.callbacks.onSkipSegment?.('INTRO', payload.position, sender);
          break;

        case 'SKIP_RECAP':
          notificationText = `${senderName} skipped recap`;
          this.callbacks.onSkipSegment?.('RECAP', payload.position, sender);
          break;

        case 'SKIP_OUTRO':
          notificationText = `${senderName} skipped outro`;
          this.callbacks.onSkipSegment?.('OUTRO', payload.position, sender);
          break;

        case 'NEXT_EPISODE':
          notificationText = `${senderName} played next episode`;
          this.callbacks.onNextEpisode?.(sender);
          break;

        case 'PREVIOUS_EPISODE':
          notificationText = `${senderName} played previous episode`;
          this.callbacks.onPrevEpisode?.(sender);
          break;

        case 'JOIN':
          notificationText = `${senderName} joined`;
          break;
      }

      if (notificationText) {
        const notif: SyncActionNotification = {
          id: `notif-${Date.now()}-${Math.random()}`,
          type: payload.type,
          sender,
          senderName,
          text: notificationText,
          timestamp: Date.now(),
        };
        this.session.lastNotification = notif;
        this.callbacks.onNotification?.(notif);
      }

      this.persistSession();
      this.callbacks.onSessionUpdate?.({ ...this.session });
    }
  }

  /**
   * Continuous Drift Correction
   *
   * Compares local player currentTime against authoritative session position.
   * If remote is playing:
   *   Authoritative Position = remotePosition + (elapsed time since timestamp)
   *
   * Drift thresholds:
   *   < 0.35s  : In-sync. No adjustment needed.
   *   0.35s - 2.0s : Soft rate adjustment (1.06x or 0.94x). Zero audio stutter!
   *   > 2.0s   : Hard seek to authoritative timestamp.
   */
  public performDriftCorrection(localCurrentTime: number) {
    if (this.isDestroyed) return;
    if (this.session.controller === this.localUserId) {
      // Local client is controller, heartbeat will keep peers in sync
      this.session.position = localCurrentTime;
      return;
    }

    // Calculate authoritative remote position
    let authoritativePos = this.session.position;
    if (this.session.playbackState === 'PLAYING') {
      const elapsedSeconds = (Date.now() - this.session.timestamp) / 1000;
      authoritativePos += Math.max(0, elapsedSeconds);
    }

    const drift = localCurrentTime - authoritativePos;
    const absDrift = Math.abs(drift);

    // 1. In sync (within 350ms window)
    if (absDrift < 0.35) {
      this.callbacks.onDriftCorrectRate?.(1.0);
      return;
    }

    // 2. Soft drift correction (350ms to 2.0s): Smooth playback rate steering
    if (absDrift >= 0.35 && absDrift < 2.0) {
      if (drift < 0) {
        // Local is lagging behind remote: speed up smoothly to catch up
        this.callbacks.onDriftCorrectRate?.(1.06);
      } else {
        // Local is running ahead of remote: gently slow down
        this.callbacks.onDriftCorrectRate?.(0.94);
      }
      return;
    }

    // 3. Hard seek (> 2.0s): Discrete re-alignment needed
    if (absDrift >= 2.0) {
      this.callbacks.onDriftCorrectRate?.(1.0);
      this.callbacks.onSeek?.(authoritativePos, this.session.controller, this.session.sequence);
    }
  }

  /**
   * Broadcast an authoritative event
   */
  public broadcastEvent(
    type: SyncPlaybackEventType,
    position: number,
    playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING',
    options?: { customMessage?: string; episodeId?: string }
  ) {
    if (this.isDestroyed) return;

    this.session.sequence += 1;
    this.session.position = position;
    this.session.playbackState = playbackState;
    this.session.timestamp = Date.now();
    this.session.controller = this.localUserId;
    if (options?.episodeId) {
      this.session.episodeId = options.episodeId;
    }

    const senderName = this.getLocalUserName();
    let message = options?.customMessage;
    if (!message) {
      switch (type) {
        case 'PLAY':
        case 'RESUME':
          message = `${senderName} resumed playback`;
          break;
        case 'PAUSE':
          message = `${senderName} paused playback`;
          break;
        case 'SEEK':
          message = `${senderName} seeked playback`;
          break;
        case 'SKIP_INTRO':
          message = `${senderName} skipped intro`;
          break;
        case 'SKIP_RECAP':
          message = `${senderName} skipped recap`;
          break;
        case 'SKIP_OUTRO':
          message = `${senderName} skipped outro`;
          break;
        case 'NEXT_EPISODE':
          message = `${senderName} played next episode`;
          break;
        case 'PREVIOUS_EPISODE':
          message = `${senderName} played previous episode`;
          break;
      }
    }

    const payload: SyncEventPayload = {
      type,
      groupId: this.groupId,
      mediaId: this.mediaId,
      episodeId: this.session.episodeId,
      position,
      playbackState,
      controller: this.localUserId,
      sequence: this.session.sequence,
      timestamp: this.session.timestamp,
      message,
    };

    // Send through BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch {
        // fallback
      }
    }

    // Persist to storage
    this.persistSession(payload);

    // Trigger local notification if applicable
    if (message && type !== 'HEARTBEAT') {
      const notif: SyncActionNotification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        type,
        sender: this.localUserId,
        senderName,
        text: message,
        timestamp: Date.now(),
      };
      this.session.lastNotification = notif;
      this.callbacks.onNotification?.(notif);
    }

    this.callbacks.onSessionUpdate?.({ ...this.session });
  }

  public broadcastReaction(emoji: QuickReactionEmoji) {
    if (this.isDestroyed) return;
    const payload: SyncEventPayload = {
      type: 'REACTION',
      groupId: this.groupId,
      mediaId: this.mediaId,
      episodeId: this.session.episodeId,
      position: this.session.position,
      playbackState: this.session.playbackState,
      controller: this.localUserId,
      sequence: this.session.sequence,
      timestamp: Date.now(),
      reactionEmoji: emoji,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch {
        // ignore
      }
    }

    this.persistSession(payload);
    this.callbacks.onReaction?.(emoji, this.localUserId, this.getLocalUserName());
  }

  private sendHeartbeat() {
    if (this.isDestroyed) return;
    const payload: SyncEventPayload = {
      type: 'HEARTBEAT',
      groupId: this.groupId,
      mediaId: this.mediaId,
      episodeId: this.session.episodeId,
      position: this.session.position,
      playbackState: this.session.playbackState,
      controller: this.localUserId,
      sequence: this.session.sequence,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch {
        // ignore
      }
    }
  }

  private checkPresenceLiveness() {
    if (this.isDestroyed) return;
    const now = Date.now();
    const companionId = this.localUserId === 'dinu' ? 'kanmani' : 'dinu';
    const companion = this.session.participants[companionId];

    if (companion && now - companion.lastSeen > 6500) {
      if (companion.presence !== 'Offline') {
        companion.presence = 'Offline';
        this.callbacks.onSessionUpdate?.({ ...this.session });
      }
    }
  }

  private persistSession(latestPayload?: SyncEventPayload) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(latestPayload || this.session));
    } catch {
      // ignore
    }
  }

  private getLocalUserName(): string {
    return this.localUserId === 'dinu' ? 'Dinu' : 'Kanmani';
  }

  public getSession(): SyncPlaybackSession {
    return { ...this.session };
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.driftCheckTimer) clearInterval(this.driftCheckTimer);
  }
}
