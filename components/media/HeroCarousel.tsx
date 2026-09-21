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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  if (!items || items.length === 0) return null;

  const currentMedia = items[currentIndex] || items[0];
  const isSaved = savedIds.includes(currentMedia.id);

  // Auto-advance every 6 seconds unless user hovers
  useEffect(() => {
    if (isHovered || items.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, isHovered, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const isSeries = currentMedia.type === 'series';
  const hasAtmos = currentMedia.badges?.includes('Dolby Atmos') || currentMedia.audioFormats?.some(a => a.includes('Atmos'));
  const has4K = currentMedia.badges?.includes('4K UHD') || currentMedia.badges?.includes('Dolby Vision') || currentMedia.badges?.includes('HDR10+');

  return (
    <section
      className="relative w-full min-h-[84vh] sm:min-h-[88vh] flex items-end pb-14 sm:pb-16 md:pb-20 pt-28 px-4 sm:px-8 lg:px-12 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Slides with Cross-Fade & Gentle Ken Burns Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMedia.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${currentMedia.backdropUrl || currentMedia.posterUrl})` }}
        >
          {/* Multi-layered luxury cinema gradients */}
          {/* Deep left fade for maximum typography readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030611] via-[#030611]/85 to-transparent w-full lg:w-4/5" />
          {/* Bottom fade into page background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030611] via-[#030611]/50 to-transparent" />
          {/* Top subtle vignette for navbar */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030611]/90 via-transparent to-transparent h-36" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(3,6,17,0.85)_100%)]" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Information */}
      <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMedia.id + '-info'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5 sm:space-y-4"
          >
            {/* Studio Pill & Quality Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-rose-950/40 border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-200 fill-amber-200" />
                <span>{isSeries ? 'DINUSTREAM SPECIAL' : (hasAtmos ? 'DINU DOLBY CINEMA' : 'DINUSTREAM EXCLUSIVE')}</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-sm">
                <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                <span>{currentMedia.matchScore || 98}% Match</span>
              </span>

              {has4K && (
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/30">
                  4K ULTRA HD
                </span>
              )}
            </div>

            {/* Feature Title with Luxury Drop Shadow */}
            <div>
              {currentMedia.tagline && (
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-300/80 mb-1.5 font-medium">
                  {currentMedia.tagline}
                </p>
              )}
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                {currentMedia.title}
              </h1>
            </div>

            {/* Meta Bar: Year, Runtime, Genres, Rating */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-slate-300 drop-shadow-md">
              <span className="font-mono text-white font-bold">{currentMedia.releaseYear || 2024}</span>
              <span className="text-white/30">•</span>
              <span className="font-mono text-slate-200">{currentMedia.runtime || '2h 15m'}</span>
              {currentMedia.genres && currentMedia.genres.length > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-slate-200">{currentMedia.genres.slice(0, 3).join(' • ')}</span>
                </>
              )}
              {currentMedia.rating && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/[0.12] text-white border border-white/[0.18]">
                    {currentMedia.rating}
                  </span>
                </>
              )}
            </div>

            {/* Description Text */}
            <p className="line-clamp-3 sm:line-clamp-4 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-slate-200/95 font-light drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {currentMedia.overview || 'Calibrated cinema master encoded in native high-bitrate direct play with Dolby Atmos audio.'}
            </p>

            {/* Audio Badges Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
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

            {/* Hero Actions: Watch Now, Sync & Play, My List, More Info */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pt-3">
              {/* ▶ Watch Now */}
              <button
                onClick={() => onPlay ? onPlay(currentMedia) : null}
                id="hero-action-play"
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-[0_4px_24px_rgba(255,255,255,0.25)] transition-all transform hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span className="tracking-tight">Watch Now</span>
              </button>

              {/* ⚡ Sync & Play */}
              <button
                onClick={() => onSyncPlay ? onSyncPlay(currentMedia) : null}
                id="hero-action-sync"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-semibold text-sm sm:text-base backdrop-blur-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 shrink-0" />
                <span className="truncate">Sync with {companionProfile.name}</span>
              </button>

              {/* ＋ My List */}
              <button
                onClick={() => onToggleSave ? onToggleSave(currentMedia) : null}
                id="hero-action-mylist"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.14] text-white font-medium text-sm sm:text-base backdrop-blur-xl transition-all transform hover:scale-105 active:scale-95"
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
                className="p-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.14] text-slate-300 hover:text-white backdrop-blur-xl transition-all transform hover:scale-105 active:scale-95"
                title="Details & Seasons"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sleek Floating Minimalist Slide Indicator Capsule (No image strip) */}
      <div className="absolute right-4 sm:right-8 lg:right-12 bottom-6 sm:bottom-10 z-20">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#050811]/85 backdrop-blur-2xl border border-white/[0.12] shadow-2xl">
          {/* Previous Arrow */}
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.18] text-slate-300 hover:text-white transition-all cinema-focus"
            aria-label="Previous Featured Movie"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numeric Slide Counter */}
          <div className="flex items-center gap-1 font-mono text-xs font-bold tracking-wider text-slate-300">
            <span className="text-white">{String(currentIndex + 1).padStart(2, '0')}</span>
            <span className="text-white/30">/</span>
            <span className="text-slate-400">{String(items.length).padStart(2, '0')}</span>
          </div>

          {/* Sleek Animated Progress Dots / Bar */}
          <div className="flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  idx === currentIndex
                    ? 'w-6 bg-gradient-to-r from-cyan-400 to-sky-500 shadow-sm shadow-cyan-400/50'
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                )}
              />
            ))}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.18] text-slate-300 hover:text-white transition-all cinema-focus"
            aria-label="Next Featured Movie"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
