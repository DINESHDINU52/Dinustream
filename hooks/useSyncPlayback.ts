'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfileId } from '@/types/cinema';
import { SyncPlaybackEngine, SyncEngineCallbacks } from '@/lib/sync/syncPlaybackEngine';
import {
  SyncPlaybackSession,
  SyncActionNotification,
  SyncPlaybackEventType,
} from '@/types/syncPlayback';
import { FloatingReactionEvent, QuickReactionEmoji } from '@/types/watchTogether';
import { useActiveProfile } from './useActiveProfile';

interface UseSyncPlaybackOptions {
  groupId?: string;
  groupName?: string;
  mediaId: string;
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

/** How long a sync action banner stays on screen. */
const NOTIFICATION_MS = 2800;
/** How long a floating reaction animates for. */
const REACTION_MS = 1900;

/**
 * Synchronized playback ("Watch Together").
 *
 * THE BUG THIS FIXES
 * ------------------
 * The effect that constructs the SyncPlaybackEngine used to list every
 * `onRemote*` callback in its dependency array. CinemaPlayer passes those as
 * inline arrow functions, so they get a fresh identity on every render — which
 * meant the engine was destroyed and rebuilt on *every single render*. The
 * consequences were fatal to the feature:
 *
 *   - the Firestore `onSnapshot` listener was torn down and re-established
 *     constantly, so remote play/pause/seek events were routinely missed;
 *   - each construction broadcasts a `JOIN` event, so every render wrote to
 *     Firestore and spammed "<name> connected" notifications;
 *   - `session.sequence` was re-seeded each time, so the sequence-number
 *     ordering that decides which command wins was meaningless;
 *   - the BroadcastChannel was closed moments after being opened;
 *   - the heartbeat and presence intervals never survived long enough to fire.
 *
 * The callbacks now live in a ref that is kept current on every render, while the
 * engine is built once per room. The engine's identity depends only on things
 * that genuinely define the session: group, media and the local profile.
 */
export function useSyncPlayback({
  groupId = 'group-movie-night',
  groupName = 'Movie Night ❤️',
  mediaId,
  episodeId,
  enabled = true,
  onRemotePlay,
  onRemotePause,
  onRemoteSeek,
  onRemoteSkipSegment,
  onRemoteNextEpisode,
  onRemotePrevEpisode,
  onDriftCorrectRate,
}: UseSyncPlaybackOptions) {
  const { profile } = useActiveProfile();
  const engineRef = useRef<SyncPlaybackEngine | null>(null);
  const [session, setSession] = useState<SyncPlaybackSession | null>(null);
  const [activeNotification, setActiveNotification] = useState<SyncActionNotification | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionEvent[]>([]);
  const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    Latest callbacks, mirrored into a ref on every render. The engine reads
    through this ref, so new callback identities never restart the session.
  */
  const handlersRef = useRef({
    onRemotePlay,
    onRemotePause,
    onRemoteSeek,
    onRemoteSkipSegment,
    onRemoteNextEpisode,
    onRemotePrevEpisode,
    onDriftCorrectRate,
  });

  useEffect(() => {
    handlersRef.current = {
      onRemotePlay,
      onRemotePause,
      onRemoteSeek,
      onRemoteSkipSegment,
      onRemoteNextEpisode,
      onRemotePrevEpisode,
      onDriftCorrectRate,
    };
  }, [
    onRemotePlay,
    onRemotePause,
    onRemoteSeek,
    onRemoteSkipSegment,
    onRemoteNextEpisode,
    onRemotePrevEpisode,
    onDriftCorrectRate,
  ]);

  const showNotification = useCallback((notif: SyncActionNotification) => {
    setActiveNotification(notif);
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    notifTimeoutRef.current = setTimeout(() => setActiveNotification(null), NOTIFICATION_MS);
  }, []);

  /*
    Build the engine once per room.

    Dependencies are deliberately limited to the values that actually identify a
    session. `groupName` is excluded too: it is cosmetic, and a rename should not
    drop everyone out of the room.
  */
  useEffect(() => {
    if (!enabled || !mediaId) return;

    const callbacks: SyncEngineCallbacks = {
      onPlay: (sender, seq) => handlersRef.current.onRemotePlay?.(sender, seq),
      onPause: (sender, seq) => handlersRef.current.onRemotePause?.(sender, seq),
      onSeek: (pos, sender, seq) => handlersRef.current.onRemoteSeek?.(pos, sender, seq),
      onSkipSegment: (type, target, sender) =>
        handlersRef.current.onRemoteSkipSegment?.(type, target, sender),
      onNextEpisode: (sender) => handlersRef.current.onRemoteNextEpisode?.(sender),
      onPrevEpisode: (sender) => handlersRef.current.onRemotePrevEpisode?.(sender),
      onDriftCorrectRate: (rate) => handlersRef.current.onDriftCorrectRate?.(rate),
      onNotification: (notif) => showNotification(notif),
      onSessionUpdate: (updated) => setSession({ ...updated }),
      onReaction: (emoji, sender, senderName) => {
        const reaction: FloatingReactionEvent = {
          id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          emoji,
          senderId: sender,
          senderName,
          timestamp: Date.now(),
          // Dispersed across the middle 60% of the screen.
          xOffsetPercent: 20 + Math.random() * 60,
        };
        setFloatingReactions((prev) => [...prev, reaction]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, REACTION_MS);
      },
    };

    const engine = new SyncPlaybackEngine(groupId, mediaId, profile.id, callbacks, groupName);
    engineRef.current = engine;

    // Deferred so the first setState lands outside the effect body.
    queueMicrotask(() => setSession(engine.getSession()));

    return () => {
      engine.destroy();
      engineRef.current = null;
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, mediaId, profile.id, enabled, showNotification]);

  const broadcastPlay = useCallback(
    (position: number) => engineRef.current?.broadcastEvent('PLAY', position, 'PLAYING', { episodeId }),
    [episodeId]
  );

  const broadcastPause = useCallback(
    (position: number) => engineRef.current?.broadcastEvent('PAUSE', position, 'PAUSED', { episodeId }),
    [episodeId]
  );

  const broadcastSeek = useCallback(
    (position: number) => engineRef.current?.broadcastEvent('SEEK', position, 'PLAYING', { episodeId }),
    [episodeId]
  );

  const broadcastResume = useCallback(
    (position: number) => engineRef.current?.broadcastEvent('RESUME', position, 'PLAYING', { episodeId }),
    [episodeId]
  );

  const broadcastSkipSegment = useCallback(
    (type: 'INTRO' | 'RECAP' | 'OUTRO', targetSeconds: number) => {
      const eventType: SyncPlaybackEventType =
        type === 'INTRO' ? 'SKIP_INTRO' : type === 'RECAP' ? 'SKIP_RECAP' : 'SKIP_OUTRO';
      engineRef.current?.broadcastEvent(eventType, targetSeconds, 'PLAYING', { episodeId });
    },
    [episodeId]
  );

  const broadcastNextEpisode = useCallback(
    () => engineRef.current?.broadcastEvent('NEXT_EPISODE', 0, 'PLAYING', { episodeId }),
    [episodeId]
  );

  const broadcastPrevEpisode = useCallback(
    () => engineRef.current?.broadcastEvent('PREVIOUS_EPISODE', 0, 'PLAYING', { episodeId }),
    [episodeId]
  );

  const performDriftCorrection = useCallback((localCurrentTime: number) => {
    engineRef.current?.performDriftCorrection(localCurrentTime);
  }, []);

  const broadcastReaction = useCallback((emoji: QuickReactionEmoji) => {
    engineRef.current?.broadcastReaction(emoji);
  }, []);

  const setControlMode = useCallback((mode: 'HOST_ONLY' | 'EVERYONE') => {
    engineRef.current?.setControlMode(mode);
  }, []);

  const updateParticipantProgress = useCallback((position: number, state: 'PLAYING' | 'PAUSED' | 'BUFFERING') => {
    engineRef.current?.updateParticipantProgress(position, state);
  }, []);

  return {
    session,
    activeNotification,
    floatingReactions,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastResume,
    broadcastSkipSegment,
    broadcastNextEpisode,
    broadcastPrevEpisode,
    broadcastReaction,
    setControlMode,
    performDriftCorrection,
    updateParticipantProgress,
  };
}
