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
  // Realtime: receive SyncPlay commands from the server and drive the player.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const { enabled, groupId } = options;
    if (!enabled || DEMO) return;

    const unsubscribe = subscribeSyncPlay((message: SyncPlaySocketMessage) => {
      if (message.MessageType !== 'SyncPlayCommand') return;
      const data = message.Data as { GroupId?: string; Command?: string; PositionTicks?: number | null };
      if (!data || !data.Command) return;
      if (groupId && data.GroupId && data.GroupId !== groupId) return;

      const cb = callbacksRef.current;
      switch (data.Command) {
        case 'Unpause':
          cb.onRemotePlay?.('dinu', 1);
          break;
        case 'Pause':
          cb.onRemotePause?.('dinu', 1);
          break;
        case 'Stop':
          cb.onRemotePause?.('dinu', 1);
          break;
        case 'Seek': {
          const seconds = (data.PositionTicks ?? 0) / TICKS_PER_SECOND;
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

  const sendReaction = useCallback((emoji: QuickReactionEmoji) => {
    const reaction: FloatingReactionEvent = {
      id: 'reaction-' + Date.now() + '-' + Math.random(),
      emoji,
      senderId: 'dinu',
      senderName: 'Dinu',
      timestamp: Date.now(),
      xOffsetPercent: Math.random() * 80 + 10,
    };
    setReactions((prev) => [...prev.slice(-15), reaction]);
  }, []);

  // --- Outbound commands → SyncPlay REST ---
  const broadcastPlay = useCallback(
    (_time?: number) => {
      setIsPlaying(true);
      if (!DEMO && options.enabled) syncPlay.play().catch(() => {});
    },
    [options.enabled]
  );

  const broadcastPause = useCallback(
    (_time?: number) => {
      setIsPlaying(false);
      if (!DEMO && options.enabled) syncPlay.pause().catch(() => {});
    },
    [options.enabled]
  );

  const broadcastSeek = useCallback(
    (target: number) => {
      setCurrentTime(target);
      if (!DEMO && options.enabled) syncPlay.seek(target * TICKS_PER_SECOND).catch(() => {});
    },
    [options.enabled]
  );

  const broadcastSkipSegment = useCallback(
    (_type: 'INTRO' | 'RECAP' | 'OUTRO', target: number) => {
      setCurrentTime(target);
      if (!DEMO && options.enabled) syncPlay.seek(target * TICKS_PER_SECOND).catch(() => {});
    },
    [options.enabled]
  );

  const performDriftCorrection = useCallback((_target: number) => {}, []);
  const updateParticipantProgress = useCallback((_pos: number, _state?: string) => {}, []);
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
