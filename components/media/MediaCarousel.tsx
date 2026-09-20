'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  action?: React.ReactNode;
  className?: string;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  kicker,
  subtitle,
  items,
  type = 'poster',
  savedIds = [],
  onToggleSave,
  onPlay,
  action,
  className,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 20);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const containerWidth = rowRef.current.clientWidth;
    // Scroll approximately 75% of container width
    const scrollAmount = direction === 'left' ? -containerWidth * 0.75 : containerWidth * 0.75;
    rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  const isContinue = type === 'continue';
  const isBackdrop = type === 'backdrop' || isContinue;

  return (
    <section className={cn('relative space-y-3 group/carousel select-none', className)}>
      {/* Section Header */}
      <div className="px-4 sm:px-8 lg:px-12">
        <SectionHeader
          kicker={kicker}
          title={title}
          subtitle={subtitle}
          action={action}
        />
      </div>

      {/* Relative Carousel Container with Edge Controls */}
      <div className="relative">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className="absolute left-0 top-0 bottom-0 z-30 w-12 hidden md:flex items-center justify-center bg-gradient-to-r from-[#06080d]/90 to-transparent text-slate-300 hover:text-white transition-opacity duration-200 opacity-0 group-hover/carousel:opacity-100 cinema-focus"
          >
            <div className="p-2 rounded-full bg-[#06080d]/80 border border-slate-400/[0.15] shadow-lg">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className="absolute right-0 top-0 bottom-0 z-30 w-12 hidden md:flex items-center justify-center bg-gradient-to-l from-[#06080d]/90 to-transparent text-slate-300 hover:text-white transition-opacity duration-200 opacity-0 group-hover/carousel:opacity-100 cinema-focus"
          >
            <div className="p-2 rounded-full bg-[#06080d]/80 border border-slate-400/[0.15] shadow-lg">
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        )}

        {/* Horizontal Track */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth px-4 sm:px-8 lg:px-12 no-scrollbar py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => {
            if (isContinue) {
              return (
                <div
                  key={item.id}
                  className="shrink-0 w-[240px] sm:w-[280px] md:w-[320px] lg:w-[350px]"
                >
                  <ContinueWatchingCard
                    item={item as ContinueWatchingItem}
                    onPlay={onPlay}
                  />
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className={cn(
                  'shrink-0',
                  isBackdrop
                    ? 'w-[240px] sm:w-[280px] md:w-[320px]'
                    : 'w-[140px] sm:w-[170px] md:w-[190px] lg:w-[210px]'
                )}
              >
                <MediaCard
                  media={item as MediaItem}
                  aspectRatio={isBackdrop ? 'backdrop' : 'poster'}
                  isSaved={savedIds.includes(item.id)}
                  onToggleSave={onToggleSave}
                  onPlay={onPlay}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
