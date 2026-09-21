'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { Play, Plus, Check, Zap, Star, Info, Film, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaCardProps {
  media: MediaItem;
  aspectRatio?: 'poster' | 'backdrop';
  onPlay?: (media: MediaItem) => void;
  onOpenDetails?: (media: MediaItem) => void;
  isSaved?: boolean;
  onToggleSave?: (media: MediaItem) => void;
  rank?: number;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  aspectRatio = 'poster',
  onPlay,
  onOpenDetails,
  isSaved = false,
  onToggleSave,
  rank,
  className,
}) => {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const isPoster = aspectRatio === 'poster';
  
  // High quality image URL with fallback
  const rawUrl = isPoster ? (media.posterUrl || media.backdropUrl) : (media.backdropUrl || media.posterUrl);
  const imageUrl = imgError ? '/avatars/guest.svg' : rawUrl;

  const handleCardClick = (e: React.MouseEvent) => {
    // If the click came from inside a button, do nothing here
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (onOpenDetails) {
      onOpenDetails(media);
    } else if (media.type === 'series') {
      router.push(`/series/${media.id}`);
    } else {
      router.push(`/movie/${media.id}`);
    }
  };

  const hasAtmos = media.badges?.includes('Dolby Atmos') || media.audioFormats?.some((a) => a.includes('Atmos'));
  const has4K = media.badges?.includes('4K UHD') || media.badges?.includes('Dolby Vision') || media.badges?.includes('HDR10+');
  const matchScore = media.matchScore || 98;

  // Hotstar special tag
  const isSpecial = media.type === 'series' || (media.genres && (media.genres.includes('Action') || media.genres.includes('Thriller')));
  const specialBadgeText = media.type === 'series' ? 'HOTSTAR SPECIAL' : (hasAtmos ? 'DOLBY CINEMA' : 'PREMIUM');

  const cardContent = (
    <motion.div
      whileHover={{ y: -6, scale: 1.05 }}
      transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        'group relative rounded-2xl overflow-hidden bg-[#070b14] border border-white/[0.08] hover:border-sky-400/60',
        'shadow-[0_4px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_40px_rgba(14,165,233,0.25)]',
        'transition-all duration-300 cursor-pointer cinema-focus select-none z-10 hover:z-20',
        isPoster ? 'aspect-[2/3]' : 'aspect-[16/9]',
        className
      )}
      onClick={handleCardClick}
      tabIndex={0}
      role="link"
      aria-label={`View ${media.title}`}
    >
      {/* Media Image with Multi-layer Scrim */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-108"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <img
          src={imageUrl}
          alt={media.title}
          className="hidden"
          onError={() => setImgError(true)}
        />
        
        {/* Hotstar Gradient Scrim — Subtle when normal, deep rich black when hovered */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050811]/70 via-transparent to-transparent opacity-70" />
      </div>

      {/* Hotstar Top Ribbon Pill */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isSpecial ? (
            <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/90 to-rose-500/90 text-white shadow-md backdrop-blur-md">
              {specialBadgeText}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-emerald-500/30">
              <Star className="w-2.5 h-2.5 fill-emerald-400" />
              {matchScore}%
            </span>
          )}

          {has4K && (
            <span className="text-[9px] font-mono font-semibold text-sky-300 bg-sky-950/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-sky-500/30">
              4K
            </span>
          )}
        </div>

        {hasAtmos && (
          <span className="text-[9px] font-bold tracking-tight text-white bg-slate-900/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-slate-700/60 shadow-sm">
            ATMOS
          </span>
        )}
      </div>

      {/* Bottom Info Strip with Hotstar Expanded Metadata on Hover */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 flex flex-col justify-end">
        {/* Media Title */}
        <h3 className="font-bold text-sm sm:text-[15px] text-white tracking-tight line-clamp-1 group-hover:text-sky-300 transition-colors drop-shadow-md">
          {media.title}
        </h3>

        {/* Hotstar Metadata Row */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 mt-1">
          <span>{media.releaseYear || 2024}</span>
          <span className="text-slate-500">•</span>
          <span>{media.runtime || '2h 10m'}</span>
          {media.rating && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-[10px] font-bold px-1 rounded bg-white/[0.1] text-slate-200">
                {media.rating}
              </span>
            </>
          )}
        </div>

        {/* Genres Pill List */}
        {media.genres && media.genres.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-normal">
            {media.genres.slice(0, 2).join(' • ')}
          </p>
        )}

        {/* Hotstar Synopsis Logline on Hover */}
        {media.overview && (
          <p className="text-[11px] text-slate-300/90 leading-snug line-clamp-2 mt-1.5 opacity-0 max-h-0 group-hover:max-h-16 group-hover:opacity-100 transition-all duration-300 ease-out font-light">
            {media.overview}
          </p>
        )}

        {/* Hotstar Action Buttons Row */}
        <div className="pt-2.5 opacity-0 max-h-0 group-hover:max-h-12 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center gap-2">
          {/* Watch Now */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay ? onPlay(media) : router.push(`/watch/${media.id}`);
            }}
            title="Watch Now"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold shadow-lg transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="tracking-tight">Watch</span>
          </button>

          {/* Sync & Play */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/watch/${media.id}?sync=true`);
            }}
            title="Watch Together (Synchronized)"
            className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-rose-400 border border-rose-500/30 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-rose-400" />
          </button>

          {/* Save to Watchlist */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
            className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.1] transition-colors shadow-sm"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          {/* Details */}
          {onOpenDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(media);
              }}
              title="Details & Episodes"
              className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 border border-white/[0.1] transition-colors shadow-sm"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // If rank is provided (Hotstar Top 10 Row), display giant stylized rank number
  if (rank !== undefined) {
    return (
      <div className="relative flex items-center group">
        <div className="shrink-0 flex items-center justify-center -mr-3 sm:-mr-4 z-0 pointer-events-none select-none">
          <span
            className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter leading-none"
            style={{
              WebkitTextStroke: '2px rgba(255, 255, 255, 0.4)',
              color: 'transparent',
              textShadow: '0 4px 16px rgba(0,0,0,0.9)',
            }}
          >
            {rank}
          </span>
        </div>
        <div className="relative z-10 w-full">
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
};
