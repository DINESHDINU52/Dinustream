'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MediaSegment } from '@/types/segments';
import { mediaSegmentManager } from '@/lib/segments/segment-service';
import { useSegmentSkipSettings } from './useSegmentSkipSettings';

interface UseMediaSegmentsOptions {
  mediaId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  enabled?: boolean;
}

export function useMediaSegments({
  mediaId,
  episodeId,
  currentTime,
  duration,
  onSeek,
  enabled = true,
}: UseMediaSegmentsOptions) {
  const { skipBehavior, setSkipBehavior, isAutoSkip, isAskToSkip, isNeverSkip } = useSegmentSkipSettings();

  // Lazy initialize segments synchronously so first frame has them without cascading render
  const [segments, setSegments] = useState<MediaSegment[]>(() => {
    if (!enabled) return [];
    return mediaSegmentManager.getSegmentsSync(mediaId, episodeId, duration);
  });

  const lastAutoSkippedIdRef = useRef<string | null>(null);
  const [autoSkipFeedback, setAutoSkipFeedback] = useState<MediaSegment | null>(null);
  const autoSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Asynchronously resolve segments (supports future Jellyfin remote metadata fetches)
  useEffect(() => {
    if (!enabled) return;
    let isSubscribed = true;

    mediaSegmentManager
      .fetchSegments(mediaId, episodeId, duration)
      .then((res) => {
        if (isSubscribed && Array.isArray(res)) {
          setSegments(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load media segments:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [mediaId, episodeId, duration, enabled]);

  // Determine active segment at current playback timestamp
  const activeSegment: MediaSegment | null = useMemo(() => {
    if (!segments || segments.length === 0) return null;
    return (
      segments.find(
        (seg) => currentTime >= seg.startSeconds && currentTime < seg.endSeconds
      ) || null
    );
  }, [segments, currentTime]);

  // Perform Skip Action
  const skipSegment = useCallback(
    (segmentToSkip?: MediaSegment) => {
      const targetSegment = segmentToSkip || activeSegment;
      if (!targetSegment) {
        // Fallback: look for next segment coming up within 15 seconds
        const upcoming = segments.find(
          (seg) => seg.startSeconds > currentTime && seg.startSeconds - currentTime <= 15
        );
        if (upcoming) {
          const target = Math.min(duration, upcoming.endSeconds + 0.5);
          onSeek(target);
        }
        return;
      }

      const target = Math.min(duration, targetSegment.endSeconds + 0.5);
      onSeek(target);
    },
    [activeSegment, segments, currentTime, duration, onSeek]
  );

  // Handle Auto-Skip
  useEffect(() => {
    if (!isAutoSkip || !activeSegment) {
      return;
    }

    // Only auto-skip once per segment pass
    if (lastAutoSkippedIdRef.current === activeSegment.id) {
      return;
    }

    lastAutoSkippedIdRef.current = activeSegment.id;
    const target = Math.min(duration, activeSegment.endSeconds + 0.5);
    onSeek(target);

    // Asynchronously dispatch feedback banner
    const feedbackTimeout = setTimeout(() => {
      setAutoSkipFeedback(activeSegment);
    }, 0);

    if (autoSkipTimerRef.current) clearTimeout(autoSkipTimerRef.current);
    autoSkipTimerRef.current = setTimeout(() => {
      setAutoSkipFeedback(null);
    }, 3500);

    return () => clearTimeout(feedbackTimeout);
  }, [isAutoSkip, activeSegment, duration, onSeek]);

  // Reset auto-skip tracker ref when user navigates away from the auto-skipped segment
  useEffect(() => {
    if (lastAutoSkippedIdRef.current) {
      const currentSkippedId = lastAutoSkippedIdRef.current;
      const seg = segments.find((s) => s.id === currentSkippedId);
      if (seg && (currentTime < seg.startSeconds - 5 || currentTime > seg.endSeconds + 10)) {
        lastAutoSkippedIdRef.current = null;
      }
    }
  }, [currentTime, segments]);

  // Dismiss feedback manually
  const dismissAutoSkipFeedback = useCallback(() => {
    if (autoSkipTimerRef.current) clearTimeout(autoSkipTimerRef.current);
    setAutoSkipFeedback(null);
  }, []);

  // Whether the skip button should be visible on screen
  const shouldShowSkipButton = isAskToSkip && activeSegment !== null;

  return {
    segments,
    activeSegment,
    shouldShowSkipButton,
    skipBehavior,
    setSkipBehavior,
    isAutoSkip,
    isAskToSkip,
    isNeverSkip,
    skipSegment,
    autoSkipFeedback,
    dismissAutoSkipFeedback,
  };
}
