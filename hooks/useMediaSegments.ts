'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MediaSegment } from '@/types/segments';
import { MOCK_SEGMENTS } from '@/lib/mock-data';
import { fetchSegments } from '@/lib/jellyfin/queries';
import { useSegmentSkipSettings } from './useSegmentSkipSettings';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

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

  const [segments, setSegments] = useState<MediaSegment[]>([]);
  const lastAutoSkippedIdRef = useRef<string | null>(null);

  // Segments belong to the episode for TV, else the movie. Fetch from Jellyfin
  // (ticks -> seconds) or fall back to the mock markers in demo mode.
  const segmentItemId = episodeId || mediaId;
  useEffect(() => {
    if (!enabled || !segmentItemId) {
      setSegments([]);
      return;
    }
    if (DEMO) {
      setSegments(MOCK_SEGMENTS);
      return;
    }
    let cancelled = false;
    fetchSegments(segmentItemId)
      .then((s) => {
        if (!cancelled) setSegments(s);
      })
      .catch(() => {
        if (!cancelled) setSegments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [segmentItemId, enabled]);
  const [autoSkipFeedback, setAutoSkipFeedback] = useState<MediaSegment | null>(null);
  const autoSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSegment: MediaSegment | null = useMemo(() => {
    if (!segments || segments.length === 0) return null;
    return (
      segments.find(
        (seg) => currentTime >= seg.startSeconds && currentTime < seg.endSeconds
      ) || null
    );
  }, [segments, currentTime]);

  const skipSegment = useCallback(
    (segmentToSkip?: MediaSegment) => {
      const targetSegment = segmentToSkip || activeSegment;
      if (!targetSegment) {
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

  useEffect(() => {
    if (!isAutoSkip || !activeSegment) return;
    if (lastAutoSkippedIdRef.current === activeSegment.id) return;

    lastAutoSkippedIdRef.current = activeSegment.id;
    const target = Math.min(duration, activeSegment.endSeconds + 0.5);
    onSeek(target);

    const feedbackTimeout = setTimeout(() => {
      setAutoSkipFeedback(activeSegment);
    }, 0);

    if (autoSkipTimerRef.current) clearTimeout(autoSkipTimerRef.current);
    autoSkipTimerRef.current = setTimeout(() => {
      setAutoSkipFeedback(null);
    }, 3500);

    return () => clearTimeout(feedbackTimeout);
  }, [isAutoSkip, activeSegment, duration, onSeek]);

  const dismissAutoSkipFeedback = useCallback(() => {
    if (autoSkipTimerRef.current) clearTimeout(autoSkipTimerRef.current);
    setAutoSkipFeedback(null);
  }, []);

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
