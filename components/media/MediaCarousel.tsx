'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem, ContinueWatchingItem } from '@/types/cinema';
import { MediaCard } from '@/components/ui/MediaCard';
import { ContinueWatchingCard } from '@/components/media/ContinueWatchingCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';

export interface MediaCarouselProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  items: (MediaItem | ContinueWatchingItem)[];
  type?: 'poster' | 'backdrop' | 'continue';
  savedIds?: string[];
  onToggleSave?: (item: MediaItem) => void;
  onPlay?: (item: MediaItem | ContinueWatchingItem) => void;
  onOpenDetails?: (item: MediaItem) => void;
  showRank?: boolean;
  action?: React.ReactNode;
  className?: string;
}

/** Ignore sub-pixel rounding when deciding whether more content exists. */
const SCROLL_EPSILON_PX = 8;

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  kicker,
  subtitle,
  items,
  type = 'poster',
  savedIds = [],
  onToggleSave,
  onPlay,
  onOpenDetails,
  showRank = false,
  action,
  className,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > SCROLL_EPSILON_PX);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON_PX);
  }, []);

  /*
    A window `resize` listener alone was not enough: the rail also changes width
    when the sidebar-less layout reflows, when the mobile browser chrome
    collapses, or when fonts finish loading — all of which resize the element
    without resizing the window. A ResizeObserver covers every case and also
    fires once on mount, which is where the initial arrow state comes from.
    (`canScrollRight` now starts `false` instead of an optimistic `true`, so a
    short row no longer renders a dead right-hand arrow before first measure.)
  */
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll, items]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = rowRef.current;
    if (!el) return;
    // Scroll roughly 75% of the visible width so a partial card stays anchored.
    const delta = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -delta : delta, behavior: 'smooth' });
  };

  const isContinue = type === 'continue';
  const isBackdrop = type === 'backdrop' || isContinue;

  return (
    <section
      aria-label={title}
      className={cn('relative space-y-3 group/carousel select-none', className)}
    >
      {/* Section header — gutters match the rail's scroll padding */}
      <div className="px-4 sm:px-8 lg:px-12">
        <SectionHeader kicker={kicker} title={title} subtitle={subtitle} action={action} />
      </div>

      <div className="relative">
        {/*
          Edge arrows are pointer-only affordances (`hidden md:flex`); touch
          users swipe the rail directly. They fade in on hover *or* keyboard
          focus within the section so they are reachable without a mouse.
        */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            aria-label={`Scroll ${title} left`}
            className="absolute left-0 top-0 bottom-0 z-30 w-12 hidden md:flex items-center justify-center bg-gradient-to-r from-cinema-bg/90 to-transparent text-slate-300 hover:text-white transition-opacity duration-200 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 cinema-focus"
          >
            <span className="p-2 rounded-full bg-cinema-bg/80 border border-slate-400/[0.15] shadow-lg">
              <ChevronLeft className="w-5 h-5" />
            </span>
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            aria-label={`Scroll ${title} right`}
            className="absolute right-0 top-0 bottom-0 z-30 w-12 hidden md:flex items-center justify-center bg-gradient-to-l from-cinema-bg/90 to-transparent text-slate-300 hover:text-white transition-opacity duration-200 opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 cinema-focus"
          >
            <span className="p-2 rounded-full bg-cinema-bg/80 border border-slate-400/[0.15] shadow-lg">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        )}

        {/*
          Horizontal track. `cinema-rail` adds momentum scrolling, contains
          overscroll so a sideways swipe cannot trigger the browser's
          back-gesture, and enables scroll-snap on coarse pointers only (snap
          points fight the programmatic `scrollBy` used by the arrows).
        */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="cinema-rail flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth px-4 sm:px-8 lg:px-12 no-scrollbar py-2"
        >
          {items.map((item, index) => {
            if (isContinue) {
              return (
                <div
                  key={item.id}
                  className="shrink-0 w-[78vw] min-[420px]:w-[260px] sm:w-[280px] md:w-[320px] lg:w-[350px]"
                >
                  <ContinueWatchingCard item={item as ContinueWatchingItem} onPlay={onPlay} />
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className={cn(
                  'shrink-0',
                  showRank
                    ? 'w-[180px] sm:w-[220px] md:w-[250px]'
                    : isBackdrop
                    ? 'w-[70vw] min-[420px]:w-[240px] sm:w-[280px] md:w-[320px]'
                    : 'w-[132px] min-[400px]:w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px]'
                )}
              >
                <MediaCard
                  media={item as MediaItem}
                  aspectRatio={isBackdrop ? 'backdrop' : 'poster'}
                  isSaved={savedIds.includes(item.id)}
                  onToggleSave={onToggleSave}
                  onPlay={onPlay}
                  onOpenDetails={onOpenDetails}
                  rank={showRank ? index + 1 : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
