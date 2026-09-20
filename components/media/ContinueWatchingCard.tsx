'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ContinueWatchingItem } from '@/types/cinema';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { calculatePercentage, formatMinutes } from '@/lib/utils';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onPlay?: (item: ContinueWatchingItem) => void;
  className?: string;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  item,
  onPlay,
  className,
}) => {
  const percent = calculatePercentage(item.progressMinutes, item.totalMinutes);
  const remainingMins = Math.max(0, item.totalMinutes - item.progressMinutes);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={() => onPlay?.(item)}
      className={cn(
        'group relative rounded-lg overflow-hidden bg-[#090e17] border border-slate-400/[0.08] hover:border-slate-300/[0.25]',
        'shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.8)]',
        'transition-all duration-200 cursor-pointer cinema-focus select-none aspect-[16/9]',
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`Resume ${item.title}`}
    >
      {/* Backdrop Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        style={{ backgroundImage: `url(${item.backdropUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/40 to-transparent" />
      </div>

      {/* Center Play Indicator */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="w-10 h-10 rounded-full bg-[#06080d]/80 border border-slate-400/20 group-hover:bg-white text-slate-300 group-hover:text-[#06080d] flex items-center justify-center shadow-lg transition-colors">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </div>
      </div>

      {/* Bottom Info & Progress Bar */}
      <div className="absolute inset-x-0 bottom-0 p-3 z-10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-medium text-white line-clamp-1 group-hover:text-slate-200 transition-colors">
            {item.title}
          </h3>
          <span className="text-[11px] text-slate-400 shrink-0 font-mono">
            {formatMinutes(remainingMins)} left
          </span>
        </div>

        {item.currentEpisodeTitle && (
          <p className="text-[11px] text-slate-400 line-clamp-1 font-light -mt-1">
            S{item.currentSeasonNumber}:E{item.currentEpisodeNumber} • {item.currentEpisodeTitle}
          </p>
        )}

        <ProgressBar progress={percent} size="xs" variant="silver" />
      </div>
    </motion.div>
  );
};
