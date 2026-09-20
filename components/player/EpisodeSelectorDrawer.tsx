'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Season, Episode } from '@/types/cinema';
import { X, Play, Clock, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface EpisodeSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seasons: Season[];
  currentEpisode?: Episode;
  onSelectEpisode: (episodeId: string) => void;
  seriesTitle: string;
}

export const EpisodeSelectorDrawer: React.FC<EpisodeSelectorDrawerProps> = ({
  isOpen,
  onClose,
  seasons,
  currentEpisode,
  onSelectEpisode,
  seriesTitle,
}) => {
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    currentEpisode?.seasonNumber || (seasons[0]?.seasonNumber ?? 1)
  );

  const activeSeason =
    seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-50 flex justify-end overflow-hidden"
        >
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md h-full bg-[#080d18]/95 border-l border-slate-400/[0.18] shadow-2xl backdrop-blur-2xl flex flex-col z-10 text-slate-100"
          >
            {/* Top Bar */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
                  Episode Selector
                </p>
                <h3 className="text-base font-bold text-white line-clamp-1">{seriesTitle}</h3>
              </div>

              <button
                onClick={onClose}
                aria-label="Close episode selector"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Season Selector Tabs */}
            {seasons.length > 1 && (
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {seasons.map((season) => {
                  const isSelected = season.seasonNumber === selectedSeasonNumber;
                  return (
                    <button
                      key={season.seasonNumber}
                      onClick={() => setSelectedSeasonNumber(season.seasonNumber)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                        isSelected
                          ? 'bg-sky-500 text-white font-semibold shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      )}
                    >
                      {season.title || `Season ${season.seasonNumber}`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeSeason?.episodes.map((ep) => {
                const isPlaying = currentEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => {
                      onSelectEpisode(ep.id);
                      onClose();
                    }}
                    className={cn(
                      'group p-3 rounded-xl border transition-all cursor-pointer flex gap-3',
                      isPlaying
                        ? 'bg-sky-500/15 border-sky-400/50 shadow-lg'
                        : 'bg-[#0d1424]/80 border-white/[0.06] hover:bg-[#131d33] hover:border-white/[0.18]'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                      {ep.thumbnailUrl ? (
                        <Image
                          src={ep.thumbnailUrl}
                          alt={ep.title}
                          fill
                          sizes="96px"
                          unoptimized
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Play className="w-5 h-5" />
                        </div>
                      )}

                      {/* Playing overlay indicator */}
                      {isPlaying ? (
                        <div className="absolute inset-0 bg-sky-950/60 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-sky-400 animate-pulse" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className={isPlaying ? 'text-sky-400 font-semibold' : ''}>
                          S{ep.seasonNumber}:E{ep.episodeNumber}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock className="w-2.5 h-2.5" />
                          {ep.runtime}
                        </span>
                      </div>

                      <h4
                        className={cn(
                          'text-xs font-semibold truncate',
                          isPlaying ? 'text-sky-300' : 'text-white'
                        )}
                      >
                        {ep.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight font-light">
                        {ep.overview}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
