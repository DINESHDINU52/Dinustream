'use client';

import { UserProfileId } from '@/types/cinema';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((notif: SyncActionNotification) => {
    setActiveNotification(notif);
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    notifTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 2800);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const callbacks: SyncEngineCallbacks = {
      onPlay: (sender, seq) => onRemotePlay?.(sender, seq),
      onPause: (sender, seq) => onRemotePause?.(sender, seq),
      onSeek: (pos, sender, seq) => onRemoteSeek?.(pos, sender, seq),
      onSkipSegment: (type, target, sender) => onRemoteSkipSegment?.(type, target, sender),
      onNextEpisode: (sender) => onRemoteNextEpisode?.(sender),
      onPrevEpisode: (sender) => onRemotePrevEpisode?.(sender),
      onDriftCorrectRate: (rate) => onDriftCorrectRate?.(rate),
      onNotification: (notif) => showNotification(notif),
      onSessionUpdate: (updated) => setSession({ ...updated }),
      onReaction: (emoji, sender, senderName) => {
        const newReaction: FloatingReactionEvent = {
          id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          emoji,
          senderId: sender,
          senderName,
          timestamp: Date.now(),
          xOffsetPercent: 20 + Math.random() * 60, // dispersed between 20% and 80% screen width
        };
        setFloatingReactions((prev) => [...prev, newReaction]);

        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 1900);
      },
    };

    const engine = new SyncPlaybackEngine(
      groupId,
      mediaId,
      profile.id,
      callbacks,
      groupName
    );
    engineRef.current = engine;
    queueMicrotask(() => {
      setSession(engine.getSession());
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, [
    groupId,
    groupName,
    mediaId,
    profile.id,
    enabled,
    onRemotePlay,
    onRemotePause,
    onRemoteSeek,
    onRemoteSkipSegment,
    onRemoteNextEpisode,
    onRemotePrevEpisode,
    onDriftCorrectRate,
    showNotification,
  ]);

  const broadcastPlay = useCallback((position: number) => {
    engineRef.current?.broadcastEvent('PLAY', position, 'PLAYING', { episodeId });
  }, [episodeId]);

  const broadcastPause = useCallback((position: number) => {
    engineRef.current?.broadcastEvent('PAUSE', position, 'PAUSED', { episodeId });
  }, [episodeId]);

  const broadcastSeek = useCallback((position: number) => {
    engineRef.current?.broadcastEvent('SEEK', position, 'PLAYING', { episodeId });
  }, [episodeId]);

  const broadcastResume = useCallback((position: number) => {
    engineRef.current?.broadcastEvent('RESUME', position, 'PLAYING', { episodeId });
  }, [episodeId]);

  const broadcastSkipSegment = useCallback((type: 'INTRO' | 'RECAP' | 'OUTRO', targetSeconds: number) => {
    const eventType: SyncPlaybackEventType =
      type === 'INTRO' ? 'SKIP_INTRO' : type === 'RECAP' ? 'SKIP_RECAP' : 'SKIP_OUTRO';
    engineRef.current?.broadcastEvent(eventType, targetSeconds, 'PLAYING', { episodeId });
  }, [episodeId]);

  const broadcastNextEpisode = useCallback(() => {
    engineRef.current?.broadcastEvent('NEXT_EPISODE', 0, 'PLAYING', { episodeId });
  }, [episodeId]);

  const broadcastPrevEpisode = useCallback(() => {
    engineRef.current?.broadcastEvent('PREVIOUS_EPISODE', 0, 'PLAYING', { episodeId });
  }, [episodeId]);

  const performDriftCorrection = useCallback((localCurrentTime: number) => {
    engineRef.current?.performDriftCorrection(localCurrentTime);
  }, []);

  const broadcastReaction = useCallback((emoji: QuickReactionEmoji) => {
    engineRef.current?.broadcastReaction(emoji);
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
    performDriftCorrection,
  };
}
