'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Play, Zap, Plus, Check, Info } from 'lucide-react';

export interface HeroBannerProps {
  media: MediaItem;
  isSaved?: boolean;
  onPlay?: () => void;
  onSyncPlay?: () => void;
  onToggleSave?: () => void;
  onOpenDetails?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  media,
  isSaved = false,
  onPlay,
  onSyncPlay,
  onToggleSave,
  onOpenDetails,
}) => {
  const { companionProfile } = useActiveProfile();

  return (
    <section className="relative w-full min-h-[82vh] sm:min-h-[88vh] flex items-end pb-12 sm:pb-16 md:pb-20 pt-28 px-4 sm:px-8 lg:px-12 overflow-hidden select-none">
      {/* Cinematic Backdrop Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${media.backdropUrl})` }}
      >
        {/* Restrained Gradient Fades — Left, Bottom & Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080d] via-[#06080d]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,8,13,0.88)_100%)]" />
      </div>

      {/* Hero Content Information */}
      <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
        {/* Meta Bar: Year, Runtime, Genres, Rating */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
          <span className="font-mono text-slate-300 font-semibold">{media.releaseYear}</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-slate-300">{media.runtime}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">{media.genres.join(' / ')}</span>
          <span className="text-slate-600">•</span>
          <Badge variant="rating" size="sm">
            {media.rating}
          </Badge>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-emerald-400 font-semibold">{media.matchScore}% Match</span>
        </div>

        {/* Feature Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-1"
        >
          {media.tagline && (
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-slate-400">
              {media.tagline}
            </p>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-tight">
            {media.title}
          </h1>
        </motion.div>

        {/* Description */}
        <p className="line-clamp-3 sm:line-clamp-4 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 font-light">
          {media.overview}
        </p>

        {/* Audio Badges & Subtitle Badge */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {media.badges.map((badge) => (
            <Badge
              key={badge}
              variant={
                badge === 'Dolby Atmos'
                  ? 'atmos'
                  : badge === 'Dolby Vision'
                  ? 'vision'
                  : 'uhd'
              }
              size="sm"
            >
              {badge}
            </Badge>
          ))}
          {/* Subtitle Badge */}
          <Badge variant="silver" size="sm">
            Subtitles [CC]
          </Badge>
        </div>

        {/* Hero Actions: Play, Sync & Play, My List, More Info */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-3">
          {/* ▶ Play */}
          <Button
            variant="silver"
            size="lg"
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={onPlay}
            id="hero-action-play"
          >
            Play
          </Button>

          {/* ⚡ Sync & Play */}
          <Button
            variant="primary"
            size="lg"
            icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400 shrink-0" />}
            onClick={onSyncPlay}
            id="hero-action-sync"
            className="max-w-full"
          >
            <span className="truncate">Sync & Play with {companionProfile.name}</span>
          </Button>

          {/* ＋ My List */}
          <Button
            variant="secondary"
            size="lg"
            icon={
              isSaved ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Plus className="w-4 h-4 text-slate-300" />
              )
            }
            onClick={onToggleSave}
            id="hero-action-mylist"
          >
            {isSaved ? 'In My List' : 'My List'}
          </Button>

          {/* ⓘ More Info */}
          <Button
            variant="ghost"
            size="lg"
            icon={<Info className="w-4 h-4 text-slate-400" />}
            onClick={onOpenDetails}
            id="hero-action-info"
          >
            More Info
          </Button>
        </div>
      </div>
    </section>
  );
};
