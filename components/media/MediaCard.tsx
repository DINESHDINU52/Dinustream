'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { CinematicOverlay } from '@/components/ui/CinematicOverlay';
import { Play, Plus, Check } from 'lucide-react';

export interface MediaCardProps {
  media: MediaItem;
  onPlay?: (media: MediaItem) => void;
  isSaved?: boolean;
  onToggleSave?: (media: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onPlay,
  isSaved = false,
  onToggleSave,
}) => {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="group relative rounded-xl overflow-hidden bg-zinc-900/60 border border-white/[0.08] hover:border-amber-500/40 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300 cursor-pointer tv-focusable select-none aspect-[2/3]"
      onClick={() => onPlay?.(media)}
      tabIndex={0}
      role="button"
      aria-label={`View ${media.title}`}
    >
      {/* Poster Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${media.posterUrl})` }}
      >
        <CinematicOverlay type="cardScrim" />
      </div>

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20">
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-emerald-500/30">
          {media.matchScore}%
        </span>
        {media.badges.includes('Dolby Atmos') && (
          <Badge variant="atmos" className="text-[9px] px-1 py-0">
            ATMOS
          </Badge>
        )}
      </div>

      {/* Bottom Content Info */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 z-20 space-y-1.5">
        <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
          {media.title}
        </h3>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>{media.releaseYear}</span>
          <span>•</span>
          <span>{media.runtime}</span>
          <Badge variant="rating" className="text-[9px] py-0 px-1">
            {media.rating}
          </Badge>
        </div>

        {/* Hover Quick Action Tray */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-1 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(media);
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-md transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            aria-label="Add to List"
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
