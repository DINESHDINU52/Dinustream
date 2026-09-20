'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Episode } from '@/types/cinema';
import { Play, X, Clock, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface NextEpisodeOverlayProps {
  nextEpisode?: Episode;
  visible: boolean;
  countdown: number;
  autoplayEnabled: boolean;
  onPlayNow: () => void;
  onCancel: () => void;
}

export const NextEpisodeOverlay: React.FC<NextEpisodeOverlayProps> = ({
  nextEpisode,
  visible,
  countdown,
  autoplayEnabled,
  onPlayNow,
  onCancel,
}) => {
  if (!nextEpisode) return null;

  // Format season and episode tag (e.g. S01 E02)
  const seasonTag = `S${String(nextEpisode.seasonNumber).padStart(2, '0')} E${String(
    nextEpisode.episodeNumber
  ).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`next-ep-${nextEpisode.id}`}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-28 right-4 sm:right-8 z-40 w-[320px] sm:w-[380px] rounded-2xl bg-[#080d18]/95 border border-slate-400/[0.22] shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden text-slate-100"
          id="next-episode-card"
        >
          {/* Subtle Accent Glow Top Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400" />

          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Header: NEXT EPISODE & S01 E02 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-[10px] font-mono font-bold tracking-widest text-sky-400 uppercase">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  NEXT EPISODE
                </span>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {seasonTag}
                </span>
              </div>

              {/* Cancel Dismiss Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                aria-label="Dismiss next episode preview"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Next Episode Preview Row (Thumbnail + Details) */}
            <div className="flex gap-3">
              <div className="relative w-28 h-18 sm:w-32 sm:h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10 shadow-md">
                {nextEpisode.thumbnailUrl ? (
                  <Image
                    src={nextEpisode.thumbnailUrl}
                    alt={nextEpisode.title}
                    fill
                    sizes="128px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#101726] text-slate-600">
                    <Play className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-1 right-1.5 px-1 py-0.5 rounded text-[9px] font-mono text-white bg-black/70 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {nextEpisode.runtime}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-semibold text-white truncate leading-tight">
                  {nextEpisode.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug font-light">
                  {nextEpisode.overview}
                </p>
              </div>
            </div>

            {/* Countdown Display: Starting in 8... */}
            {autoplayEnabled && (
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  Starting in {countdown}...
                </span>

                {/* Micro Progress Track */}
                <span className="text-[10px] text-slate-500">Autoplay ON</span>
              </div>
            )}

            {/* Action Buttons: [PLAY NOW] [CANCEL] */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayNow();
                }}
                id="autoplay-play-now-btn"
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform hover:scale-[1.02] cinema-focus"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY NOW</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                id="autoplay-cancel-btn"
                className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-semibold text-xs border border-white/15 transition-colors cinema-focus"
              >
                CANCEL
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
