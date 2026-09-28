'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UserProfileId } from '@/types/cinema';
import { SyncPlaybackSession, SyncActionNotification } from '@/types/syncPlayback';
import { FloatingReactionEvent, QuickReactionEmoji } from '@/types/watchTogether';
import { syncPlay } from '@/lib/jellyfin/syncPlay';
import { subscribeSyncPlay, SyncPlaySocketMessage } from '@/lib/jellyfin/syncPlaySocket';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
const TICKS_PER_SECOND = 10_000_000;

interface UseSyncPlaybackOptions {
  groupId?: string;
  groupName?: string;
  mediaId?: string;
  episodeId?: string;
  enabled?: boolean;
  onRemotePlay?: (sender: UserProfileId, sequence: number) => void;
  onRemotePause?: (sender: UserProfileId, sequence: number) => void;
  onRemoteSeek?: (position: number, sender: UserProfileId, sequence: number) => void;
  onRemoteSkipSegment?: (type: 'INTRO' | 'RECAP' | 'OUTRO', targetSeconds: number, sender: UserProfileId) => void;
  onRemoteNextEpisode?: (sender: UserProfileId) => void;
  onRemotePrevEpisode?: (sender: UserProfileId) => void;
  onDriftCorrectRate?: (rate: number) => void;
}

export function useSyncPlayback(options: UseSyncPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [reactions, setReactions] = useState<FloatingReactionEvent[]>([]);

  // Latest callbacks, held in a ref so the WS subscription (created once) never
  // goes stale when CinemaPlayer re-renders with fresh inline closures.
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // -------------------------------------------------------------------------
  // Session registration: join the SyncPlay group on Jellyfin backend.
  // Without this, Jellyfin returns 403 Forbidden for all commands and does
  // not route outbound events to this session.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!options.enabled || DEMO || !options.groupId) return;
    const gid = options.groupId;
    let active = true;

    syncPlay
      .joinGroup(gid)
      .then(() => {
        return Promise.all([
          syncPlay.setIgnoreWait(true),
          syncPlay.ready(0, true),
        ]);
      })
      .catch((err) => {
        console.warn('[useSyncPlayback] Failed to join SyncPlay group:', err);
      });

    const pingInterval = setInterval(() => {
      if (active) {
        syncPlay.ping(20).catch(() => {});
      }
    }, 5_000);

    return () => {
      active = false;
      clearInterval(pingInterval);
    };
  }, [options.enabled, options.groupId]);

  // -------------------------------------------------------------------------
  // Realtime: receive SyncPlay commands from the server and drive the player.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const { enabled, groupId } = options;
    if (!enabled || DEMO) return;

    const normGid = groupId ? groupId.toLowerCase().replace(/-/g, '') : '';

    const unsubscribe = subscribeSyncPlay((message: SyncPlaySocketMessage) => {
      if (message.MessageType !== 'SyncPlayCommand') return;
      const data = message.Data as { GroupId?: string; Command?: string; PositionTicks?: number | null };
      if (!data || !data.Command) return;
      if (normGid && data.GroupId) {
        const msgGid = String(data.GroupId).toLowerCase().replace(/-/g, '');
        if (msgGid !== normGid) return;
      }

      const cb = callbacksRef.current;
      switch (data.Command) {
        case 'Unpause':
          setIsPlaying(true);
          cb.onRemotePlay?.('dinu', 1);
          break;
        case 'Pause':
        case 'Stop':
          setIsPlaying(false);
          cb.onRemotePause?.('dinu', 1);
          break;
        case 'Seek': {
          const seconds = (data.PositionTicks ?? 0) / TICKS_PER_SECOND;
          setCurrentTime(seconds);
          cb.onRemoteSeek?.(seconds, 'dinu', 1);
          break;
        }
        default:
          break;
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled, options.groupId]);

  // -------------------------------------------------------------------------
  // Local dual-sync: same-browser tabs communicate via BroadcastChannel
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!options.enabled || !options.groupId || typeof window === 'undefined') return;
    const gid = options.groupId;
    try {
      const channel = new BroadcastChannel(`dinustream_playback_${gid}`);
      channel.onmessage = (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        const cb = callbacksRef.current;
        switch (event.data.type) {
          case 'PLAY':
            setIsPlaying(true);
            cb.onRemotePlay?.(event.data.sender || 'dinu', 1);
            break;
          case 'PAUSE':
            setIsPlaying(false);
            cb.onRemotePause?.(event.data.sender || 'dinu', 1);
            break;
          case 'SEEK':
            setCurrentTime(event.data.position || 0);
            cb.onRemoteSeek?.(event.data.position || 0, event.data.sender || 'dinu', 1);
            break;
          case 'REACTION':
            if (event.data.reaction) {
              setReactions((prev) => [...prev.slice(-15), event.data.reaction]);
            }
            break;
        }
      };
      return () => {
        channel.close();
      };
    } catch {
      /* ignore */
    }
  }, [options.enabled, options.groupId]);

  const session: SyncPlaybackSession = useMemo(
    () => ({
      groupId: options.groupId || 'group-movie-night',
      groupName: options.groupName || 'Movie Night ❤️',
      mediaId: options.mediaId || '',
      episodeId: options.episodeId,
      playbackState: isPlaying ? 'PLAYING' : 'PAUSED',
      position: currentTime,
      timestamp: Date.now(),
      controller: 'dinu',
      sequence: 1,
      hostId: 'dinu',
      controlMode: 'EVERYONE',
      // Participants are still a placeholder — map these from the SyncPlay
      // group's /Sessions once the lobby is fully wired (see docs/SYNCPLAY.md).
      participants: {},
    }),
    [options.groupId, options.groupName, options.mediaId, options.episodeId, isPlaying, currentTime]
  );

  const sendReaction = useCallback(
    (emoji: QuickReactionEmoji) => {
      const reaction: FloatingReactionEvent = {
        id: 'reaction-' + Date.now() + '-' + Math.random(),
        emoji,
        senderId: 'dinu',
        senderName: 'Dinu',
        timestamp: Date.now(),
        xOffsetPercent: Math.random() * 80 + 10,
      };
      setReactions((prev) => [...prev.slice(-15), reaction]);
      if (options.groupId && typeof window !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`dinustream_playback_${options.groupId}`);
          ch.postMessage({ type: 'REACTION', reaction });
          setTimeout(() => ch.close(), 100);
        } catch {
          /* ignore */
        }
      }
    },
    [options.groupId]
  );

  // --- Outbound commands → SyncPlay REST + BroadcastChannel ---
  const broadcastPlay = useCallback(
    (time?: number) => {
      setIsPlaying(true);
      if (!DEMO && options.enabled && options.groupId) {
        syncPlay.play().catch(() => {});
      }
      if (options.groupId && typeof window !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`dinustream_playback_${options.groupId}`);
          ch.postMessage({ type: 'PLAY', position: time, sender: 'dinu' });
          setTimeout(() => ch.close(), 100);
        } catch {
          /* ignore */
        }
      }
    },
    [options.enabled, options.groupId]
  );

  const broadcastPause = useCallback(
    (time?: number) => {
      setIsPlaying(false);
      if (!DEMO && options.enabled && options.groupId) {
        syncPlay.pause().catch(() => {});
      }
      if (options.groupId && typeof window !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`dinustream_playback_${options.groupId}`);
          ch.postMessage({ type: 'PAUSE', position: time, sender: 'dinu' });
          setTimeout(() => ch.close(), 100);
        } catch {
          /* ignore */
        }
      }
    },
    [options.enabled, options.groupId]
  );

  const broadcastSeek = useCallback(
    (target: number) => {
      setCurrentTime(target);
      if (!DEMO && options.enabled && options.groupId) {
        syncPlay.seek(target * TICKS_PER_SECOND).catch(() => {});
      }
      if (options.groupId && typeof window !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`dinustream_playback_${options.groupId}`);
          ch.postMessage({ type: 'SEEK', position: target, sender: 'dinu' });
          setTimeout(() => ch.close(), 100);
        } catch {
          /* ignore */
        }
      }
    },
    [options.enabled, options.groupId]
  );

  const broadcastSkipSegment = useCallback(
    (_type: 'INTRO' | 'RECAP' | 'OUTRO', target: number) => {
      setCurrentTime(target);
      if (!DEMO && options.enabled && options.groupId) {
        syncPlay.seek(target * TICKS_PER_SECOND).catch(() => {});
      }
      if (options.groupId && typeof window !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`dinustream_playback_${options.groupId}`);
          ch.postMessage({ type: 'SEEK', position: target, sender: 'dinu' });
          setTimeout(() => ch.close(), 100);
        } catch {
          /* ignore */
        }
      }
    },
    [options.enabled, options.groupId]
  );

  const performDriftCorrection = useCallback((_target: number) => {}, []);
  const updateParticipantProgress = useCallback(
    (pos: number, state?: string) => {
      if (!DEMO && options.enabled && options.groupId) {
        if (state === 'PLAYING') {
          syncPlay.ready(pos * TICKS_PER_SECOND, true).catch(() => {});
        } else if (state === 'BUFFERING') {
          syncPlay.buffering(true, pos * TICKS_PER_SECOND, false).catch(() => {});
        } else if (state === 'PAUSED') {
          syncPlay.ready(pos * TICKS_PER_SECOND, false).catch(() => {});
        }
      }
    },
    [options.enabled, options.groupId]
  );
  const setControlMode = useCallback((_mode: 'HOST_ONLY' | 'EVERYONE') => {}, []);

  return {
    isPlaying,
    currentTime,
    sendReaction,
    broadcastReaction: sendReaction,
    floatingReactions: reactions,
    isSynced: true,
    latencyMs: 8,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastSkipSegment,
    performDriftCorrection,
    updateParticipantProgress,
    session,
    activeNotification: null as SyncActionNotification | null,
    setControlMode,
  };
}
