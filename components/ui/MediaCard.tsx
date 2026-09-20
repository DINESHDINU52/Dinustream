'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { Play, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaCardProps {
  media: MediaItem;
  aspectRatio?: 'poster' | 'backdrop';
  onPlay?: (media: MediaItem) => void;
  isSaved?: boolean;
  onToggleSave?: (media: MediaItem) => void;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  aspectRatio = 'poster',
  onPlay,
  isSaved = false,
  onToggleSave,
  className,
}) => {
  const router = useRouter();
  const isPoster = aspectRatio === 'poster';
  const imageUrl = isPoster ? media.posterUrl : media.backdropUrl;

  const handleCardClick = () => {
    if (media.type === 'series') {
      router.push(`/series/${media.id}`);
    } else {
      router.push(`/movie/${media.id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'group relative rounded-lg overflow-hidden bg-[#0a0f18] border border-slate-400/[0.08] hover:border-slate-300/[0.25]',
        'shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.85)]',
        'transition-all duration-200 cursor-pointer cinema-focus select-none',
        isPoster ? 'aspect-[2/3]' : 'aspect-[16/9]',
        className
      )}
      onClick={handleCardClick}
      tabIndex={0}
      role="link"
      aria-label={`View details for ${media.title}`}
    >
      {/* Media Image with Scrim Gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        {/* Subtle Cinematic Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
      </div>

      {/* Top Meta Strip */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
        <span className="text-[10px] font-mono font-medium text-slate-300 bg-[#06080d]/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/[0.08]">
          {media.matchScore}%
        </span>
        {media.badges.includes('Dolby Atmos') && (
          <Badge variant="atmos" size="sm">
            Atmos
          </Badge>
        )}
      </div>

      {/* Bottom Info Strip */}
      <div className="absolute inset-x-0 bottom-0 p-3 z-10 space-y-1">
        <h3 className="font-medium text-sm text-white line-clamp-1 group-hover:text-slate-200 transition-colors">
          {media.title}
        </h3>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>{media.releaseYear}</span>
          <span className="text-slate-600">•</span>
          <span>{media.runtime}</span>
          <span className="text-slate-600">•</span>
          <span className="text-[10px] uppercase font-mono text-slate-400">{media.rating}</span>
        </div>

        {/* Hover Quick Action Buttons */}
        <div className="pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(media);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded bg-white hover:bg-slate-100 text-[#070a10] text-xs font-semibold shadow-sm transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            aria-label="Toggle Saved List"
            className="p-1.5 rounded bg-[#162032]/90 hover:bg-[#1f2d45] text-slate-200 border border-slate-400/20 transition-colors"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-slate-200" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
