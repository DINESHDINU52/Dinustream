'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Play, Plus, Check, Zap, Star, Info, Sparkles } from 'lucide-react';
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

  // Reliable image URL fallback
  const rawUrl = isPoster
    ? (media.posterUrl || media.backdropUrl)
    : (media.backdropUrl || media.posterUrl);
  const imageUrl = imgError ? '/avatars/guest.svg' : rawUrl;

  const handleCardClick = (e: React.MouseEvent) => {
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

  // DinuStream Special branding
  const isSpecial = media.type === 'series' || (media.genres && (media.genres.includes('Action') || media.genres.includes('Thriller')));
  const specialBadgeText = media.type === 'series' ? 'DINUSTREAM SPECIAL' : (hasAtmos ? 'DOLBY CINEMA' : 'PREMIUM');

  const cardContent = (
    <motion.div
      whileHover={{ y: -6, scale: 1.04 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-2xl overflow-hidden bg-[#060913] border border-white/[0.08] hover:border-cyan-400/50',
        'shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_20px_45px_rgba(6,182,212,0.22)]',
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
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-108"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <img
          src={imageUrl}
          alt={media.title}
          className="hidden"
          onError={() => setImgError(true)}
        />

        {/* Cinematic Gradient Scrim — Deep dark bottom for ultra-crisp text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-[#040711]/40 to-transparent opacity-90 group-hover:opacity-98 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040711]/70 via-transparent to-transparent opacity-60" />
      </div>

      {/* Top Quality & Special Ribbon Strip */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isSpecial ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/95 to-rose-500/95 text-white shadow-md backdrop-blur-md border border-white/20">
              <Sparkles className="w-2.5 h-2.5 text-amber-200 fill-amber-200" />
              <span>{specialBadgeText}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-emerald-400" />
              <span>{matchScore}%</span>
            </span>
          )}

          {has4K && (
            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-cyan-500/30">
              4K
            </span>
          )}
        </div>

        {hasAtmos && (
          <span className="text-[9px] font-bold tracking-tight text-white bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/20 shadow-sm">
            ATMOS
          </span>
        )}
      </div>

      {/* Bottom Info Strip with Ultra-Crisp Typography & Hover Expansion */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 flex flex-col justify-end">
        {/* Media Title with Multi-Stop Shadow for Legibility */}
        <h3 className="font-bold text-sm sm:text-[15px] text-white tracking-tight leading-tight line-clamp-1 group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          {media.title}
        </h3>

        {/* Metadata Line */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 mt-1 drop-shadow-md">
          <span className="text-white font-semibold">{media.releaseYear || 2024}</span>
          <span className="text-white/30">•</span>
          <span className="text-slate-300">{media.runtime || '2h 10m'}</span>
          {media.rating && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/[0.12] text-white border border-white/[0.15]">
                {media.rating}
              </span>
            </>
          )}
        </div>

        {/* Genres Pill Line */}
        {media.genres && media.genres.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-light drop-shadow-sm">
            {media.genres.slice(0, 2).join(' • ')}
          </p>
        )}

        {/* Synopsis Logline with High Readability on Hover */}
        {media.overview && (
          <p className="text-[11px] text-slate-200 leading-snug line-clamp-2 mt-1.5 opacity-0 max-h-0 group-hover:max-h-16 group-hover:opacity-100 transition-all duration-300 ease-out font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {media.overview}
          </p>
        )}

        {/* Action Buttons Row */}
        <div className="pt-2.5 opacity-0 max-h-0 group-hover:max-h-12 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center gap-2">
          {/* Watch Now */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay ? onPlay(media) : router.push(`/watch/${media.id}`);
            }}
            title="Watch Now"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold shadow-md transition-all transform active:scale-95"
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
            className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-cyan-300 border border-cyan-400/30 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-cyan-400" />
          </button>

          {/* Watchlist Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
            className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-slate-200 border border-white/[0.14] transition-colors shadow-sm"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          {/* Info Modal Trigger */}
          {onOpenDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(media);
              }}
              title="Details & Episodes"
              className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-slate-300 hover:text-white border border-white/[0.14] transition-colors shadow-sm"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // If rank is provided (DinuStream Top 10 Row), display giant stylized rank number
  if (rank !== undefined) {
    return (
      <div className="relative flex items-center group">
        <div className="shrink-0 flex items-center justify-center -mr-3 sm:-mr-4 z-0 pointer-events-none select-none">
          <span
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none"
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
