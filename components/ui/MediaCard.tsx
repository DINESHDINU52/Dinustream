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

/** Shown when the artwork URL is missing or fails to load. */
const FALLBACK_ARTWORK = '/avatars/guest.svg';

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

  const rawUrl = isPoster
    ? media.posterUrl || media.backdropUrl
    : media.backdropUrl || media.posterUrl;
  const imageUrl = imgError || !rawUrl ? FALLBACK_ARTWORK : rawUrl;

  /** Default navigation target when no explicit handler is supplied. */
  const openTarget = () => {
    if (onOpenDetails) {
      onOpenDetails(media);
    } else if (media.type === 'series') {
      router.push(`/series/${media.id}`);
    } else {
      router.push(`/movie/${media.id}`);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Let the nested action buttons handle their own clicks.
    if ((e.target as HTMLElement).closest('button')) return;
    openTarget();
  };

  /*
    The card is an interactive `role="link"` with `tabIndex={0}` but had no key
    handler, so keyboard and TV-remote users could focus it and never activate
    it. Enter/Space now behave like a real link/button.
  */
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      openTarget();
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(media);
    } else {
      router.push(`/watch/${media.id}`);
    }
  };

  const hasAtmos =
    media.badges?.some((b) => b === 'Dolby Atmos' || b === 'Spatial Audio') ||
    media.audioFormats?.some((a) => a.includes('Atmos'));
  const has4K = media.badges?.some(
    (b) => b === '4K UHD' || b === 'Dolby Vision' || b === 'HDR10+'
  );
  const matchScore = media.matchScore || 98;

  const isSpecial =
    media.type === 'series' ||
    Boolean(media.genres?.some((g) => g === 'Action' || g === 'Thriller'));
  // Series get their own ribbon copy; everything else is simply "PREMIUM".
  // (The previous ternary returned 'PREMIUM' for both of its branches.)
  const specialBadgeText = media.type === 'series' ? 'DINUSTREAM SPECIAL' : 'PREMIUM';

  const cardContent = (
    <motion.div
      whileHover={{ y: -6, scale: 1.04 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-2xl overflow-hidden bg-[#060913] border border-white/[0.08] hover:border-cyan-400/50',
        'shadow-[0_6px_20px_rgba(0,0,0,0.55)] hover:shadow-[0_14px_36px_rgba(6,182,212,0.25)]',
        'transition-all duration-300 cursor-pointer cinema-focus select-none z-10 hover:z-20',
        isPoster ? 'aspect-[2/3]' : 'aspect-[16/9]',
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`View ${media.title}`}
    >
      {/*
        Artwork is a real <img> rather than a CSS background so it can be lazily
        loaded and decoded off the main thread. A long poster row used to kick
        off every full-size background fetch immediately, which is the single
        biggest data cost of the home page on a phone.
      */}
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/*
          Single bottom scrim confined to the lower half of the card.

          There used to be two full-bleed gradients stacked over the whole
          poster (one up, one down, at 90% and 60% opacity), so every piece of
          artwork was veiled top to bottom and lost its contrast and colour. The
          scrim now only covers the strip the text actually sits on.
        */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#04070f] via-[#04070f]/70 to-transparent" />
      </div>

      {/* Top quality & special ribbon strip */}
      <div className="absolute top-2 inset-x-2 flex items-start justify-between gap-1 z-10 pointer-events-none">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {isSpecial ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/95 to-rose-500/95 text-white shadow-md backdrop-blur-md border border-white/20">
              <Sparkles className="w-2.5 h-2.5 text-amber-200 fill-amber-200 shrink-0" />
              <span className="truncate">{specialBadgeText}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-emerald-400 shrink-0" />
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
          <span className="text-[9px] font-bold tracking-tight text-white bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/20 shadow-sm shrink-0">
            ATMOS
          </span>
        )}
      </div>

      {/* Bottom info strip */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5 z-10 flex flex-col justify-end">
        <h3 className="font-bold text-[13px] sm:text-[15px] text-white tracking-tight leading-tight line-clamp-2 group-hover:text-cyan-300 transition-colors text-on-art">
          {media.title}
        </h3>

        {/* Metadata line */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] sm:text-[11px] font-medium text-slate-300 mt-1 text-on-art">
          <span className="text-white font-semibold">{media.releaseYear || '—'}</span>
          {media.runtime && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-slate-300">{media.runtime}</span>
            </>
          )}
          {media.rating && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.12] text-white border border-white/[0.15]">
                {media.rating}
              </span>
            </>
          )}
        </div>

        {/* Genres — dropped on the tightest poster widths where it just clutters */}
        {media.genres && media.genres.length > 0 && (
          <p className="hidden sm:block text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-light text-on-art">
            {media.genres.slice(0, 2).join(' • ')}
          </p>
        )}

        {/*
          Synopsis + action row use `.reveal-on-hover`, which only collapses
          them behind `:hover` on devices that actually have a hover-capable
          pointer. Previously these were hidden with `opacity-0 max-h-0
          group-hover:…`, so on any touchscreen the Watch / Sync / Watchlist /
          Info buttons were permanently invisible and unreachable.
        */}
        {media.overview && (
          <p className="reveal-on-hover text-[11px] text-slate-200 leading-snug line-clamp-2 mt-1.5 font-light text-on-art">
            {media.overview}
          </p>
        )}

        <div className="reveal-on-hover mt-2 flex items-center gap-1.5 sm:gap-2">
          {/* Watch now */}
          <button
            onClick={handlePlay}
            title="Watch Now"
            aria-label={`Watch ${media.title}`}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold shadow-md transition-transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="tracking-tight truncate">Watch</span>
          </button>

          {/* Sync & play */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/watch/${media.id}?sync=true`);
            }}
            title="Watch Together (Synchronized)"
            aria-label={`Watch ${media.title} together`}
            className="p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-cyan-300 border border-cyan-400/30 transition-colors shadow-sm shrink-0"
          >
            <Zap className="w-3.5 h-3.5 fill-cyan-400" />
          </button>

          {/* Watchlist toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(media);
            }}
            title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            aria-label={isSaved ? `Remove ${media.title} from watchlist` : `Add ${media.title} to watchlist`}
            aria-pressed={isSaved}
            className="p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-slate-200 border border-white/[0.14] transition-colors shadow-sm shrink-0"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          {/* Details — hidden on the narrowest cards so the row never wraps */}
          {onOpenDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(media);
              }}
              title="Details & Episodes"
              aria-label={`Details for ${media.title}`}
              className="hidden sm:block p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-slate-300 hover:text-white border border-white/[0.14] transition-colors shadow-sm shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Top 10 row: oversized outlined rank numeral tucked behind the artwork.
  if (rank !== undefined) {
    return (
      <div className="relative flex items-center group">
        <span
          aria-hidden="true"
          /*
            `shrink-0` + a floor width stops the numeral from collapsing to
            nothing (or, at the other extreme, from eating most of the fixed
            track width) so the poster keeps a predictable size at every
            breakpoint.
          */
          className="shrink-0 w-10 sm:w-12 md:w-14 flex items-center justify-center -mr-3 sm:-mr-4 z-0 pointer-events-none select-none text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none"
          style={{
            WebkitTextStroke: '2px rgba(255, 255, 255, 0.4)',
            color: 'transparent',
            textShadow: '0 4px 16px rgba(0,0,0,0.9)',
          }}
        >
          {rank}
        </span>
        <div className="relative z-10 flex-1 min-w-0">{cardContent}</div>
      </div>
    );
  }

  return cardContent;
};
