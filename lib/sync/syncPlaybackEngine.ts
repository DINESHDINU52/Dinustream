import { UserProfileId } from '@/types/cinema';
import {
  SyncPlaybackEventType,
  SyncPlaybackSession,
  SyncEventPayload,
  SyncActionNotification,
} from '@/types/syncPlayback';
import { QuickReactionEmoji } from '@/types/watchTogether';
import { PROFILES } from '@/lib/constants';
import { firestore } from '@/lib/firebase/config';
import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

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
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private presenceTimer: NodeJS.Timeout | null = null;
  private storageKey: string;
  private isDestroyed = false;
  private unsubscribeFirestore: Unsubscribe | null = null;

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
            if (parsed.participants) {
              initialSession.participants = {
                ...initialSession.participants,
                ...parsed.participants,
              };
            }
          }
        }
      } catch {
        // Fall back
      }
    }

    this.session = initialSession;
    this.initNetworking();
  }

  private initNetworking() {
    if (typeof window !== 'undefined') {
      // 1. BroadcastChannel for zero-latency local / same-machine sync
      try {
        this.channel = new BroadcastChannel(`dinustream_sync_${this.groupId}`);
        this.channel.onmessage = (event) => {
          this.handleIncomingPayload(event.data);
        };
      } catch {
        // Fallback
      }

      // 2. Storage event listener fallback
      window.addEventListener('storage', this.handleStorageEvent);

      // 3. Firestore Real-Time cross-device synchronization
      if (firestore) {
        try {
          const docRef = doc(firestore, 'dinustream_sync_rooms', this.groupId);
          this.unsubscribeFirestore = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data() as SyncEventPayload;
              if (data && data.controller !== this.localUserId) {
                this.handleIncomingPayload(data);
              }
            }
          });
        } catch (err) {
          console.warn('[SyncEngine] Firestore listener failed; using local real-time mesh:', err);
        }
      }

      // 4. Heartbeat interval
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, 3000);

      // 5. Presence checker (mark stale participants offline)
      this.presenceTimer = setInterval(() => {
        this.checkPresenceLiveness();
      }, 5000);

      // Announce JOIN event
      this.broadcastEvent('JOIN', this.session.position, this.session.playbackState, {
        customMessage: `${this.getLocalUserName()} connected`,
      });
    }
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === this.storageKey && e.newValue) {
      try {
        const payload: SyncEventPayload = JSON.parse(e.newValue);
        this.handleIncomingPayload(payload);
      } catch {}
    }
  };

  private handleIncomingPayload(payload: SyncEventPayload) {
    if (!payload || payload.groupId !== this.groupId) return;
    if (payload.controller === this.localUserId && payload.type !== 'HEARTBEAT') {
      return;
    }

    const sender = payload.controller;
    const senderName = this.getUserName(sender);

    // Update participant presence & position dynamically
    if (!this.session.participants[sender]) {
      const pProfile = PROFILES[sender];
      this.session.participants[sender] = {
        id: sender,
        name: senderName,
        avatarUrl: pProfile?.avatarUrl || '/avatars/guest.svg',
        presence: payload.playbackState === 'PLAYING' ? 'Watching' : 'Paused',
        lastSeen: Date.now(),
        position: payload.position,
      };
    } else {
      this.session.participants[sender].lastSeen = Date.now();
      this.session.participants[sender].position = payload.position;
      this.session.participants[sender].presence =
        payload.playbackState === 'PLAYING'
          ? 'Watching'
          : payload.playbackState === 'BUFFERING'
          ? 'Buffering'
          : 'Paused';
    }

    if (payload.type === 'HEARTBEAT') {
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

    const isHigherSequence = payload.sequence >= this.session.sequence;

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
          notificationText = notificationText || `${senderName} seeked playback`;
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
          notificationText = `${senderName} connected to room`;
          break;
      }

      if (notificationText) {
        const notif: SyncActionNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  public performDriftCorrection(localCurrentTime: number) {
    if (this.isDestroyed) return;
    if (this.session.controller === this.localUserId) {
      this.session.position = localCurrentTime;
      return;
    }

    let authoritativePos = this.session.position;
    if (this.session.playbackState === 'PLAYING') {
      const elapsedSeconds = (Date.now() - this.session.timestamp) / 1000;
      authoritativePos += Math.max(0, elapsedSeconds);
    }

    const drift = localCurrentTime - authoritativePos;
    const absDrift = Math.abs(drift);

    if (absDrift < 0.35) {
      this.callbacks.onDriftCorrectRate?.(1.0);
      return;
    }

    if (absDrift >= 0.35 && absDrift < 2.0) {
      if (drift < 0) {
        this.callbacks.onDriftCorrectRate?.(1.06);
      } else {
        this.callbacks.onDriftCorrectRate?.(0.94);
      }
      return;
    }

    if (absDrift >= 2.0) {
      this.callbacks.onDriftCorrectRate?.(1.0);
      this.callbacks.onSeek?.(authoritativePos, this.session.controller, this.session.sequence);
    }
  }

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

    // 1. BroadcastChannel (local mesh)
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch {}
    }

    // 2. Firestore real-time cloud write
    if (firestore) {
      try {
        const docRef = doc(firestore, 'dinustream_sync_rooms', this.groupId);
        setDoc(docRef, payload, { merge: true }).catch(() => {});
      } catch {}
    }

    // 3. LocalStorage persistence
    this.persistSession(payload);

    if (message && type !== 'HEARTBEAT') {
      const notif: SyncActionNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      } catch {}
    }

    if (firestore) {
      try {
        const docRef = doc(firestore, 'dinustream_sync_rooms', this.groupId);
        setDoc(docRef, payload, { merge: true }).catch(() => {});
      } catch {}
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
      } catch {}
    }

    if (firestore) {
      try {
        const docRef = doc(firestore, 'dinustream_sync_rooms', this.groupId);
        setDoc(docRef, { ...payload, lastHeartbeat: Date.now() }, { merge: true }).catch(() => {});
      } catch {}
    }
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

  private persistSession(latestPayload?: SyncEventPayload) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(latestPayload || this.session));
    } catch {}
  }

  private getLocalUserName(): string {
    return this.getUserName(this.localUserId);
  }

  private getUserName(id: UserProfileId): string {
    return PROFILES[id]?.name || String(id);
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
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.presenceTimer) clearInterval(this.presenceTimer);
  }
}
