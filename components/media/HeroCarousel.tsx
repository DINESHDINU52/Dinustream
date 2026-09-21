'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Play, Zap, Plus, Check, Info, ChevronLeft, ChevronRight, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeroCarouselProps {
  items: MediaItem[];
  savedIds?: string[];
  onPlay?: (item: MediaItem) => void;
  onSyncPlay?: (item: MediaItem) => void;
  onToggleSave?: (item: MediaItem) => void;
  onOpenDetails?: (item: MediaItem) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  items,
  savedIds = [],
  onPlay,
  onSyncPlay,
  onToggleSave,
  onOpenDetails,
}) => {
  const { companionProfile } = useActiveProfile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const DURATION_MS = 6500;
  const TICK_MS = 50;

  // 1. Preload all backdrop images immediately on mount for ZERO latency
  useEffect(() => {
    if (!items || items.length === 0) return;
    items.forEach((item) => {
      const url = item.backdropUrl || item.posterUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [items]);

  // 2. Real-time smooth progress tracking
  useEffect(() => {
    if (isHovered || items.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((curr) => (curr + 1) % items.length);
          return 0;
        }
        return prev + (TICK_MS / DURATION_MS) * 100;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items.length, isHovered, currentIndex]);

  const handleNext = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleSelectSlide = (idx: number) => {
    setProgress(0);
    setCurrentIndex(idx);
  };

  if (!items || items.length === 0) return null;

  const currentMedia = items[currentIndex] || items[0];
  const isSaved = savedIds.includes(currentMedia.id);
  const isSeries = currentMedia.type === 'series';
  const hasAtmos = currentMedia.badges?.includes('Dolby Atmos') || currentMedia.audioFormats?.some((a) => a.includes('Atmos'));
  const has4K = currentMedia.badges?.includes('4K UHD') || currentMedia.badges?.includes('Dolby Vision') || currentMedia.badges?.includes('HDR10+');

  return (
    <section
      className="relative w-full h-[100dvh] min-h-[100vh] flex items-end pb-16 sm:pb-20 md:pb-24 pt-24 sm:pt-28 px-4 sm:px-8 lg:px-12 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pre-rendered persistent backdrop slides with zero latency and Ken Burns zoom */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {items.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          const bgUrl = item.backdropUrl || item.posterUrl;

          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{
                opacity: isCurrent ? 1 : 0,
                scale: isCurrent ? 1.05 : 1,
              }}
              transition={{
                opacity: { duration: 0.9, ease: [0.25, 1, 0.5, 1] },
                scale: { duration: 9, ease: 'easeOut' },
              }}
              className="absolute inset-0 bg-cover bg-center will-change-transform"
              style={{
                backgroundImage: `url(${bgUrl})`,
                pointerEvents: isCurrent ? 'auto' : 'none',
              }}
            />
          );
        })}

        {/* Ambient colored lighting spill matching cinematic theater aura */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-sky-600/20 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none" />

        {/* Multi-layered luxury cinema gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030611] via-[#030611]/85 to-transparent w-full lg:w-4/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030611] via-[#030611]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030611]/90 via-transparent to-transparent h-36" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,6,17,0.85)_100%)]" />
      </div>

      {/* Hero Content Information with Smooth Staggered Animation */}
      <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMedia.id + '-info'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5 sm:space-y-4"
          >
            {/* Studio Ribbon & Quality Badges (Clean Sans Typography) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white shadow-xl shadow-rose-950/40 border border-white/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>{isSeries ? 'DINUSTREAM SPECIAL' : (hasAtmos ? 'DINU DOLBY CINEMA' : 'DINUSTREAM EXCLUSIVE')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/35 shadow-md">
                <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>{currentMedia.matchScore || 98}% Match</span>
              </span>

              {has4K && (
                <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/35">
                  4K ULTRA HD
                </span>
              )}
            </div>

            {/* Feature Title with Luxury Drop Shadow */}
            <div>
              {currentMedia.tagline && (
                <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-cyan-300 font-bold mb-2 drop-shadow">
                  {currentMedia.tagline}
                </p>
              )}
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.04] drop-shadow-[0_8px_32px_rgba(0,0,0,0.95)]">
                {currentMedia.title}
              </h1>
            </div>

            {/* Human-Readable Metadata Bar (No Monospace Code Font) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-sm sm:text-base font-semibold text-slate-200 drop-shadow-md">
              <span className="text-white font-bold">{currentMedia.releaseYear || 2024}</span>
              <span className="text-white/35">•</span>
              <span className="text-slate-200">{currentMedia.runtime || '2h 15m'}</span>
              {currentMedia.genres && currentMedia.genres.length > 0 && (
                <>
                  <span className="text-white/35">•</span>
                  <span className="text-slate-200">{currentMedia.genres.slice(0, 3).join(', ')}</span>
                </>
              )}
              {currentMedia.rating && (
                <>
                  <span className="text-white/35">•</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white/[0.15] text-white border border-white/20">
                    {currentMedia.rating}
                  </span>
                </>
              )}
            </div>

            {/* Description Text */}
            <p className="line-clamp-3 sm:line-clamp-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-200/95 font-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {currentMedia.overview || 'Calibrated cinema master encoded in native high-bitrate direct play with Dolby Atmos audio.'}
            </p>

            {/* Audio Badges Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hasAtmos && (
                <Badge variant="atmos" size="sm" className="shadow-md">
                  Dolby Atmos
                </Badge>
              )}
              <Badge variant="uhd" size="sm">
                4K UHD
              </Badge>
              <Badge variant="silver" size="sm">
                5.1 Audio
              </Badge>
              <Badge variant="silver" size="sm">
                Subtitles [CC]
              </Badge>
            </div>

            {/* Hero Actions: Watch Now, Sync with Companion, My List, More Info */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {/* ▶ Watch Now */}
              <button
                onClick={() => onPlay ? onPlay(currentMedia) : null}
                id="hero-action-play"
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-[0_4px_30px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span className="tracking-tight">Watch Now</span>
              </button>

              {/* ⚡ Sync & Play */}
              <button
                onClick={() => onSyncPlay ? onSyncPlay(currentMedia) : null}
                id="hero-action-sync"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-semibold text-sm sm:text-base backdrop-blur-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 shrink-0" />
                <span className="truncate">Sync with {companionProfile.name}</span>
              </button>

              {/* ＋ My List */}
              <button
                onClick={() => onToggleSave ? onToggleSave(currentMedia) : null}
                id="hero-action-mylist"
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white font-medium text-sm sm:text-base backdrop-blur-xl transition-all transform hover:scale-105 active:scale-95"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-slate-300" />
                    <span>My List</span>
                  </>
                )}
              </button>

              {/* ⓘ More Info */}
              <button
                onClick={() => onOpenDetails ? onOpenDetails(currentMedia) : null}
                id="hero-action-info"
                className="p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-slate-300 hover:text-white backdrop-blur-xl transition-all transform hover:scale-105 active:scale-95"
                title="Details & Seasons"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Animated Slide Indicator Capsule with Real-time Progress Fill */}
      <div className="absolute right-4 sm:right-8 lg:right-12 bottom-8 sm:bottom-12 z-20">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#050811]/90 backdrop-blur-2xl border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
          {/* Previous Arrow */}
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.2] text-slate-300 hover:text-white transition-all cinema-focus"
            aria-label="Previous Featured Title"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Clean Slide Counter */}
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300">
            <span className="text-white">{currentIndex + 1}</span>
            <span className="text-white/30">/</span>
            <span className="text-slate-400">{items.length}</span>
          </div>

          {/* Animated Progress Bars for Each Slide */}
          <div className="flex items-center gap-2">
            {items.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={cn(
                    'relative h-2 rounded-full overflow-hidden transition-all duration-300',
                    isCurrent ? 'w-10 bg-white/20' : 'w-2 bg-white/30 hover:bg-white/60'
                  )}
                >
                  {isCurrent && (
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.2] text-slate-300 hover:text-white transition-all cinema-focus"
            aria-label="Next Featured Title"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
