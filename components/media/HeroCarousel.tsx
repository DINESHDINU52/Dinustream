'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Badge } from '@/components/ui/Badge';
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Star, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeroCarouselProps {
  items: MediaItem[];
  savedIds?: string[];
  onPlay?: (item: MediaItem) => void;
  onToggleSave?: (item: MediaItem) => void;
  onOpenDetails?: (item: MediaItem) => void;
}

/** Time each featured slide stays on screen. */
const DURATION_MS = 6500;
/** Progress-bar refresh interval. */
const TICK_MS = 50;
/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 48;
/** Longer stream labels are dropped rather than wrapped across the badge row. */
const MAX_BADGE_LABEL_CHARS = 22;

/**
 * Returns true when the item advertises a spatial/object-based audio mix.
 *
 * Both label spellings are accepted on purpose: the Jellyfin adapter tags some
 * items "Dolby Atmos" and the curated catalogue uses "Spatial Audio". The old
 * implementation only checked "Spatial Audio" here while the home page only
 * checked "Dolby Atmos", so the hero badge and the "Spatial Audio Showcases"
 * row disagreed about the very same title.
 */
function hasSpatialAudio(item: MediaItem): boolean {
  return Boolean(
    item.badges?.some((b) => b === 'Dolby Atmos' || b === 'Spatial Audio') ||
      item.audioFormats?.some((a) => a.includes('Atmos'))
  );
}

function hasHighDynamicRange(item: MediaItem): boolean {
  return Boolean(
    item.badges?.some((b) => b === '4K UHD' || b === 'Dolby Vision' || b === 'HDR10+')
  );
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  items,
  savedIds = [],
  onPlay,
  onToggleSave,
  onOpenDetails,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  /*
    Elapsed time lives in a ref rather than in the `progress` state so the
    auto-advance timer does not have to be torn down and rebuilt on every tick
    or every slide change.

    The previous implementation called `setCurrentIndex` from *inside* the
    `setProgress` updater. Updater functions must be pure — React may invoke
    them more than once (it does exactly that in development Strict Mode), so
    the carousel could skip a slide on every cycle.
  */
  const elapsedRef = useRef(0);

  const slideCount = items?.length ?? 0;

  const goToIndex = useCallback((index: number) => {
    elapsedRef.current = 0;
    setProgress(0);
    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (slideCount === 0) return;
    goToIndex((currentIndex + 1) % slideCount);
  }, [currentIndex, slideCount, goToIndex]);

  const handlePrev = useCallback(() => {
    if (slideCount === 0) return;
    goToIndex((currentIndex - 1 + slideCount) % slideCount);
  }, [currentIndex, slideCount, goToIndex]);

  /*
    Preload only the neighbouring backdrops instead of every featured backdrop
    at once. Seven simultaneous 1080p+ image requests on a phone competes with
    the catalogue fetches and burns mobile data for slides the user may never
    reach.
  */
  useEffect(() => {
    if (slideCount === 0) return;
    const indexes = [currentIndex, (currentIndex + 1) % slideCount, (currentIndex - 1 + slideCount) % slideCount];
    indexes.forEach((i) => {
      const url = items[i]?.backdropUrl || items[i]?.posterUrl;
      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
  }, [items, currentIndex, slideCount]);

  // Auto-advance + smooth progress. Only setState inside the async callback.
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;

    const interval = setInterval(() => {
      elapsedRef.current += TICK_MS;

      if (elapsedRef.current >= DURATION_MS) {
        elapsedRef.current = 0;
        setProgress(0);
        setCurrentIndex((curr) => (curr + 1) % slideCount);
        return;
      }

      setProgress((elapsedRef.current / DURATION_MS) * 100);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isPaused, slideCount]);

  /*
    Touch swipe navigation. A hover-driven carousel has no affordance at all on
    a phone beyond the small arrow buttons, and horizontal swiping is the
    expected gesture on every streaming app.
  */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const touch = e.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Ignore predominantly vertical gestures so page scrolling still works.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) handleNext();
    else handlePrev();
  };

  if (!items || slideCount === 0) return null;

  const currentMedia = items[currentIndex] || items[0];
  const isSaved = savedIds.includes(currentMedia.id);
  const isSeries = currentMedia.type === 'series';
  const hasAtmos = hasSpatialAudio(currentMedia);
  const has4K = hasHighDynamicRange(currentMedia);
  const hasSubtitles = (currentMedia.subtitleLanguages?.length ?? 0) > 0;

  /* Primary audio track only, and only if it reads like a format name. */
  const firstAudio = currentMedia.audioFormats?.[0]?.trim();
  const primaryAudioLabel =
    firstAudio && firstAudio.length <= MAX_BADGE_LABEL_CHARS && !hasAtmos ? firstAudio : '';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured titles"
      /*
        Height.

        `svh` (small viewport height) is the height with the mobile browser
        chrome *visible*, so the hero and its action buttons always fit without
        the user having to scroll — unlike the original `h-[100dvh]
        min-h-[100vh]`, where `min-h-[100vh]` re-imposed the larger
        chrome-hidden height that `dvh` existed to avoid.

        Two further corrections: `lg:h-screen-safe` did nothing at all (a `lg:`
        variant cannot be applied to a hand-written CSS class, only to a Tailwind
        utility), and `min-h-[560px]` exceeded the viewport on short laptop
        windows, so the hero overflowed the screen and its own bottom gradient
        showed up below the fold as an empty black band. The floor is now below
        any realistic window height and the hero tracks the viewport exactly.
      */
      className="relative w-full h-[100svh] min-h-[460px] max-h-[1100px] flex items-end pb-16 sm:pb-20 md:pb-24 pt-navbar px-4 sm:px-8 lg:px-12 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Persistent backdrop slides with Ken Burns zoom */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
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
              className="absolute inset-0 bg-cover bg-center will-change-transform pointer-events-none"
              style={{ backgroundImage: `url(${bgUrl})` }}
            />
          );
        })}

        {/*
          Scrims.

          This was five stacked layers: a left-to-right wash, a bottom-to-top
          wash, a top wash, a blue bloom, a cyan bloom *and* a full-frame radial
          vignette at 85% opacity. Multiplied together they left barely any of
          the artwork visible and flattened everything to near-black, which is
          the "grey, washed out" look — and the bottom wash going fully opaque
          (`from-[#030611]`) is what produced the dead black band.

          It is now two directional gradients that stop short of opaque, so the
          backdrop stays visible edge to edge while the copy keeps its contrast.
          The blooms and the vignette are gone; text legibility is handled by the
          tight `.text-on-art` shadow instead of by darkening the whole image.
        */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#04070f]/95 via-[#04070f]/55 to-transparent lg:to-[#04070f]/5" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#06080d] via-[#06080d]/55 to-transparent" />
        {/* Short top scrim purely so the fixed navbar stays readable. */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#04070f]/80 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 w-full max-w-3xl space-y-4 sm:space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMedia.id + '-info'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Studio ribbon & quality badges */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white shadow-xl shadow-rose-950/40 border border-white/25">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-200 fill-amber-200 shrink-0" />
                <span>{isSeries ? 'DINUSTREAM SPECIAL' : hasAtmos ? 'DINUSTREAM CINEMA' : 'DINUSTREAM EXCLUSIVE'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-emerald-500/35 shadow-md">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />
                <span>{currentMedia.matchScore || 98}% Match</span>
              </span>

              {has4K && (
                <span className="text-[10px] sm:text-xs font-bold text-cyan-300 bg-cyan-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/35">
                  4K ULTRA HD
                </span>
              )}
            </div>

            {/* Feature title */}
            <div>
              {currentMedia.tagline && (
                <p className="text-[11px] sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-cyan-300 font-bold mb-2 text-on-art line-clamp-1">
                  {currentMedia.tagline}
                </p>
              )}
              {/*
                Type scale starts at 3xl rather than 4xl: a long title at
                `text-4xl` wrapped to four lines on a 360px screen and shoved
                the buttons off the hero.
              */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white leading-[1.05] text-on-art-strong line-clamp-3">
                {currentMedia.title}
              </h1>
            </div>

            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-3.5 text-xs sm:text-base font-semibold text-slate-200 text-on-art">
              <span className="text-white font-bold">{currentMedia.releaseYear || '—'}</span>
              {currentMedia.runtime && (
                <>
                  <span className="text-white/35">•</span>
                  <span className="text-slate-200">{currentMedia.runtime}</span>
                </>
              )}
              {currentMedia.genres && currentMedia.genres.length > 0 && (
                <>
                  <span className="text-white/35">•</span>
                  <span className="text-slate-200">{currentMedia.genres.slice(0, 3).join(', ')}</span>
                </>
              )}
              {currentMedia.rating && (
                <>
                  <span className="text-white/35">•</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-white/[0.15] text-white border border-white/20">
                    {currentMedia.rating}
                  </span>
                </>
              )}
            </div>

            {/* Synopsis — hidden on the shortest screens where it would crowd out the CTAs */}
            <p className="hidden min-[400px]:block line-clamp-2 sm:line-clamp-3 lg:line-clamp-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-200/95 text-on-art">
              {currentMedia.overview ||
                'Calibrated cinema master encoded in native high-bitrate direct play.'}
            </p>

            {/*
              Capability badges, derived from the item's own metadata — they used
              to hard-code "4K UHD", "5.1 Audio" and "Subtitles [CC]" for every
              title regardless of what the file contained.

              Only the primary audio track is shown, and only when its label is
              short. Jellyfin's per-stream `DisplayTitle` can be an entire
              release-group filename, so rendering several of them turned this
              row into a wall of unreadable capitals. The adapter now emits clean
              labels (`Dolby TrueHD 7.1`), and the length guard is a second line
              of defence for anything unusual that slips through.
            */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {hasAtmos && (
                <Badge variant="atmos" size="sm">
                  Dolby Atmos
                </Badge>
              )}
              {has4K && (
                <Badge variant="uhd" size="sm">
                  4K UHD
                </Badge>
              )}
              {primaryAudioLabel && (
                <Badge variant="silver" size="sm">
                  {primaryAudioLabel}
                </Badge>
              )}
              {hasSubtitles && (
                <Badge variant="silver" size="sm">
                  CC
                </Badge>
              )}
            </div>

            {/*
              Action row. Buttons stretch to fill the row on the narrowest
              screens (`flex-1 basis-[calc(50%-0.375rem)]`) so they line up in a
              tidy 2-up grid instead of producing a ragged wrap, and every
              target clears 44px.
            */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3">
              {/* Sync & Play */}
              <button
                onClick={() => onPlay?.(currentMedia)}
                id="hero-action-play"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-[0_4px_30px_rgba(255,255,255,0.3)] transition-transform hover:scale-105 active:scale-95 cinema-focus"
              >
                <Zap className="w-5 h-5 text-sky-500 fill-sky-500 shrink-0" />
                <span className="tracking-tight">Sync &amp; Play</span>
              </button>

              {/* My List */}
              <button
                onClick={() => onToggleSave?.(currentMedia)}
                id="hero-action-mylist"
                aria-pressed={isSaved}
                className="flex-1 basis-[calc(50%-0.375rem)] sm:flex-none sm:basis-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white font-medium text-sm sm:text-base backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 cinema-focus"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>My List</span>
                  </>
                )}
              </button>

              {/* More info */}
              <button
                onClick={() => onOpenDetails?.(currentMedia)}
                id="hero-action-info"
                aria-label="Details and seasons"
                className="flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-slate-300 hover:text-white backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 cinema-focus shrink-0"
                title="Details & Seasons"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/*
        Slide indicator.

        On phones this is centred just above the safe-area rather than pinned
        bottom-right: at `right-4 bottom-8` a 7-slide capsule (arrows + counter
        + seven pills ≈ 230px) sat directly on top of the action buttons. The
        arrows and counter are desktop-only, leaving a compact dot strip on
        touch devices where swiping is the primary gesture.
      */}
      {slideCount > 1 && (
        <div className="absolute z-20 bottom-3 left-1/2 -translate-x-1/2 sm:bottom-8 sm:left-auto sm:translate-x-0 sm:right-8 lg:right-12 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl glass">
            <button
              onClick={handlePrev}
              className="hidden sm:flex p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.2] text-slate-300 hover:text-white transition-colors cinema-focus"
              aria-label="Previous featured title"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300">
              <span className="text-white">{currentIndex + 1}</span>
              <span className="text-white/30">/</span>
              <span className="text-slate-400">{slideCount}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {items.map((item, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => goToIndex(idx)}
                    aria-label={`Go to ${item.title}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn(
                      'relative h-2 rounded-full overflow-hidden transition-all duration-300 cinema-focus',
                      isCurrent ? 'w-8 sm:w-10 bg-white/20' : 'w-2 bg-white/30 hover:bg-white/60'
                    )}
                  >
                    {isCurrent && (
                      <span
                        className="absolute inset-y-0 left-0 block bg-gradient-to-r from-cyan-400 to-sky-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              className="hidden sm:flex p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.2] text-slate-300 hover:text-white transition-colors cinema-focus"
              aria-label="Next featured title"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
