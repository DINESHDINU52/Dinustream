'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { Play, Plus, Check, Sparkles, Zap, Star } from 'lucide-react';
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

  const hasAtmos = media.badges?.includes('Dolby Atmos') || media.audioFormats?.some((a) => a.includes('Atmos'));
  const has4K = media.badges?.includes('4K UHD') || media.badges?.includes('Dolby Vision') || media.badges?.includes('HDR10+');
  const matchScore = media.matchScore || 98;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'group relative rounded-xl overflow-hidden bg-[#090e18] border border-slate-700/40 hover:border-cyan-500/50',
        'shadow-[0_4px_20px_rgba(0,0,0,0.65)] hover:shadow-[0_16px_36px_rgba(56,189,248,0.2)]',
        'transition-all duration-300 cursor-pointer cinema-focus select-none',
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
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        {/* Subtle Cinematic Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/45 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#06080d]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Top Meta Strip: Match Score & Quality Badges */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-sm">
            <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
            {matchScore}%
          </span>
          {has4K && (
            <span className="text-[9px] font-mono font-semibold text-cyan-300 bg-cyan-950/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-cyan-500/30">
              4K UHD
            </span>
          )}
        </div>

        {hasAtmos && (
          <Badge variant="atmos" size="sm" className="shadow-md">
            Dolby Atmos
          </Badge>
        )}
      </div>

      {/* Bottom Info Strip with Details & Micro-Interactions */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 space-y-1.5">
        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-cyan-300 transition-colors drop-shadow">
          {media.title}
        </h3>

        {/* Accuracy Metadata Row */}
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span>{media.releaseYear || 2024}</span>
          <span className="text-slate-600">•</span>
          <span>{media.runtime}</span>
          {media.rating && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-slate-300">
                {media.rating}
              </span>
            </>
          )}
        </div>

        {/* Hover Quick Action Buttons */}
        <div className="pt-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay ? onPlay(media) : router.push(`/watch/${media.id}`);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#05070c] text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/watch/${media.id}?sync=true`);
            }}
            title="Watch Together (Synchronized)"
            className="p-2 rounded-lg bg-[#162032]/90 hover:bg-[#1e2c44] text-rose-300 border border-rose-500/30 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-rose-400" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            title="My List"
            aria-label="Toggle Saved List"
            className="p-2 rounded-lg bg-[#162032]/90 hover:bg-[#1e2c44] text-slate-200 border border-slate-500/30 transition-colors shadow-sm"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
