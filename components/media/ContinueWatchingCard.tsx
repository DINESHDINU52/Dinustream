'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ContinueWatchingItem } from '@/types/cinema';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { calculatePercentage, formatMinutes, cn } from '@/lib/utils';
import { Play } from 'lucide-react';

export interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onPlay?: (item: ContinueWatchingItem) => void;
  className?: string;
}

const FALLBACK_ARTWORK = '/avatars/guest.svg';

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  item,
  onPlay,
  className,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const percent = calculatePercentage(item.progressMinutes, item.totalMinutes);
  const remainingMins = Math.max(0, item.totalMinutes - item.progressMinutes);
  const artwork = imgError || !item.backdropUrl ? FALLBACK_ARTWORK : item.backdropUrl;

  const activate = () => onPlay?.(item);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={activate}
      /* Keyboard/TV-remote parity for a div acting as a button. */
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          activate();
        }
      }}
      className={cn(
        'group relative rounded-lg overflow-hidden bg-[#090e17] border border-slate-400/[0.08] hover:border-slate-300/[0.25]',
        'shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.8)]',
        'transition-all duration-200 cursor-pointer cinema-focus select-none aspect-video',
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`Resume ${item.title}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 overflow-hidden bg-[#060a14]">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-white/[0.04] animate-shimmer pointer-events-none" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={cn(
            'w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.02]',
            imgLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/40 to-transparent pointer-events-none" />
      </div>

      {/* Centre play indicator */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <span className="w-10 h-10 rounded-full bg-cinema-bg/80 border border-slate-400/20 group-hover:bg-white text-slate-300 group-hover:text-cinema-bg flex items-center justify-center shadow-lg transition-colors">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </span>
      </div>

      {/* Bottom info & progress */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 z-10 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <h3 className="font-medium text-white line-clamp-1 min-w-0 group-hover:text-slate-200 transition-colors">
            {item.title}
          </h3>
          {/* `formatMinutes` is rounded first: progress is tracked in fractional
              minutes, which otherwise rendered as "1h 23.4m left". */}
          <span className="text-[11px] text-slate-400 shrink-0 font-mono">
            {formatMinutes(Math.round(remainingMins))} left
          </span>
        </div>

        {item.currentEpisodeTitle && (
          <p className="text-[11px] text-slate-400 line-clamp-1 font-light">
            S{item.currentSeasonNumber}:E{item.currentEpisodeNumber} • {item.currentEpisodeTitle}
          </p>
        )}

        <ProgressBar progress={percent} size="xs" variant="silver" />
      </div>
    </motion.div>
  );
};
