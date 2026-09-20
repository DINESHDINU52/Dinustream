'use client';

import React from 'react';
import { MediaSegment } from '@/types/segments';
import { cn } from '@/lib/utils';

interface SegmentTimelineMarkersProps {
  segments: MediaSegment[];
  duration: number;
}

export const SegmentTimelineMarkers: React.FC<SegmentTimelineMarkersProps> = ({
  segments,
  duration,
}) => {
  if (!segments || segments.length === 0 || duration <= 0) {
    return null;
  }

  return (
    <>
      {segments.map((segment) => {
        const startPct = Math.max(0, Math.min(100, (segment.startSeconds / duration) * 100));
        const endPct = Math.max(0, Math.min(100, (segment.endSeconds / duration) * 100));
        const widthPct = Math.max(0.4, endPct - startPct);

        return (
          <div
            key={segment.id}
            data-testid={`timeline-segment-${segment.type.toLowerCase()}`}
            title={`${segment.buttonLabel}: ${segment.title}`}
            className={cn(
              'absolute top-0 bottom-0 rounded-sm z-10 pointer-events-none transition-opacity duration-150',
              segment.type === 'INTRO' && 'bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
              segment.type === 'RECAP' && 'bg-indigo-400/90 shadow-[0_0_8px_rgba(129,140,248,0.8)]',
              segment.type === 'OUTRO' && 'bg-sky-400/90 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
              segment.type === 'PREVIEW' && 'bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
              segment.type === 'COMMERCIAL' && 'bg-rose-400/90 shadow-[0_0_8px_rgba(251,113,133,0.8)]'
            )}
            style={{
              left: `${startPct}%`,
              width: `${widthPct}%`,
            }}
          />
        );
      })}
    </>
  );
};
