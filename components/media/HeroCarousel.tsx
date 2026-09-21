'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Play, Zap, Plus, Check, Info, ChevronLeft, ChevronRight, Volume2, Star } from 'lucide-react';
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

  // Guard against empty items
  if (!items || items.length === 0) return null;

  const currentMedia = items[currentIndex] || items[0];
  const isSaved = savedIds.includes(currentMedia.id);

  // Auto-advance every 6 seconds unless user is hovering
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
      className="relative w-full min-h-[82vh] sm:min-h-[88vh] flex items-end pb-12 sm:pb-16 md:pb-20 pt-28 px-4 sm:px-8 lg:px-12 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Slides with Cross-Fade Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMedia.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${currentMedia.backdropUrl || currentMedia.posterUrl})` }}
        >
          {/* Multi-tier Hotstar Cinematic Gradients */}
          {/* Left deep dark scrim for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050811] via-[#050811]/85 to-transparent sm:w-3/4" />
          {/* Bottom fade into page background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/45 to-transparent" />
          {/* Top vignette for top navbar */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050811]/90 via-transparent to-transparent h-32" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,8,17,0.85)_100%)]" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Information Container */}
      <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMedia.id + '-info'}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Studio Pill Banner */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-950/40">
                {isSeries ? 'HOTSTAR SPECIAL' : (hasAtmos ? 'DOLBY CINEMA PREMIERE' : 'FEATURE PRESENTATION')}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/30">
                <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                {currentMedia.matchScore || 98}% Match
              </span>
              {has4K && (
                <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-sky-500/30">
                  4K ULTRA HD
                </span>
              )}
            </div>

            {/* Feature Title */}
            <div>
              {currentMedia.tagline && (
                <p className="text-xs font-mono uppercase tracking-[0.25em] text-slate-400 mb-1">
                  {currentMedia.tagline}
                </p>
              )}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
                {currentMedia.title}
              </h1>
            </div>

            {/* Meta Bar: Year, Runtime, Genres, Rating */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-slate-300">
              <span className="font-mono text-white font-semibold">{currentMedia.releaseYear || 2024}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-slate-200">{currentMedia.runtime || '2h 15m'}</span>
              {currentMedia.genres && currentMedia.genres.length > 0 && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">{currentMedia.genres.slice(0, 3).join(' • ')}</span>
                </>
              )}
              {currentMedia.rating && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-white/[0.12] text-white border border-white/[0.15]">
                    {currentMedia.rating}
                  </span>
                </>
              )}
            </div>

            {/* Description Text */}
            <p className="line-clamp-3 sm:line-clamp-4 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-slate-200/90 font-light drop-shadow">
              {currentMedia.overview || 'Experience high-fidelity private cinema streaming with uncompressed Dolby Atmos master tracks and calibrated HDR10+ presentation.'}
            </p>

            {/* Audio & Video Badges */}
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
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm sm:text-base shadow-xl hover:shadow-white/20 transition-all transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Watch Now</span>
              </button>

              {/* ⚡ Sync & Play */}
              <button
                onClick={() => onSyncPlay ? onSyncPlay(currentMedia) : null}
                id="hero-action-sync"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-400/40 text-sky-200 font-semibold text-sm sm:text-base backdrop-blur-md shadow-lg transition-all transform active:scale-95"
              >
                <Zap className="w-4 h-4 text-sky-400 fill-sky-400 shrink-0" />
                <span className="truncate">Sync with {companionProfile.name}</span>
              </button>

              {/* ＋ My List */}
              <button
                onClick={() => onToggleSave ? onToggleSave(currentMedia) : null}
                id="hero-action-mylist"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white font-medium text-sm sm:text-base backdrop-blur-md transition-all transform active:scale-95"
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
                className="p-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-slate-300 hover:text-white backdrop-blur-md transition-all"
                title="Details & Seasons"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hotstar Slide Navigation Controls & Interactive Thumbnail Selector */}
      <div className="absolute right-4 sm:right-8 lg:right-12 bottom-6 sm:bottom-10 z-20 flex flex-col items-end gap-3">
        {/* Thumbnails Row (Desktop) */}
        <div className="hidden lg:flex items-center gap-2.5 p-1.5 rounded-2xl bg-[#050811]/60 backdrop-blur-md border border-white/[0.08]">
          {items.slice(0, 5).map((item, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'relative w-20 h-12 rounded-lg overflow-hidden transition-all duration-300 transform',
                  isActive
                    ? 'ring-2 ring-sky-400 scale-105 shadow-lg shadow-sky-500/20'
                    : 'opacity-50 hover:opacity-85'
                )}
              >
                <img
                  src={item.backdropUrl || item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Slide Indicators & Chevrons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.1] text-white transition-all"
            aria-label="Previous Featured Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cn(
                  'transition-all duration-300 rounded-full',
                  idx === currentIndex
                    ? 'w-6 h-1.5 bg-sky-400'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.1] text-white transition-all"
            aria-label="Next Featured Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
