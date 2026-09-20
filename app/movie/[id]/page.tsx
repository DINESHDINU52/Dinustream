'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { getMediaById, getSimilarMedia, FEATURED_HERO_MEDIA } from '@/lib/mock-data';
import { mediaService } from '@/lib/services/mediaService';
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton, CacheStatus } from '@/components/sync';
import { getSyncStatus, SyncState } from '@/lib/api/syncManager';
import {
  Play,
  Plus,
  Check,
  Film,
  ArrowLeft,
  Volume2,
  Subtitles,
  HardDrive,
} from 'lucide-react';

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, companionProfile } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [liveMedia, setLiveMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (id) {
      mediaService.getMediaById(id).then((m) => {
        if (m) setLiveMedia(m);
      }).catch(() => {});
    }
  }, [id]);

  const fallbackMedia = useMemo(() => {
    if (!id) return FEATURED_HERO_MEDIA;
    return getMediaById(id) || FEATURED_HERO_MEDIA;
  }, [id]);

  const media = liveMedia || fallbackMedia;

  const similarMedia = useMemo(() => {
    return getSimilarMedia(media.id, 6);
  }, [media.id]);

  const [savedIds, setSavedIds] = useState<string[]>([
    'blade-runner-2049',
    'dune-part-two',
    'shogun',
  ]);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [cacheState, setCacheState] = useState<SyncState>('not_cached');

  useEffect(() => {
    getSyncStatus(`${media.id}.mkv`)
      .then((res) => setCacheState(res.state))
      .catch(() => setCacheState('not_cached'));
  }, [media.id]);

  const isSaved = savedIds.includes(media.id);

  const notify = (message: string, subtext?: string) => {
    setToastInfo({ message, subtext });
    setTimeout(() => setToastInfo(null), 3500);
  };

  const handleToggleSave = () => {
    setSavedIds((prev) => {
      const exists = prev.includes(media.id);
      const updated = exists ? prev.filter((item) => item !== media.id) : [...prev, media.id];
      notify(
        exists ? `Removed "${media.title}" from My List` : `Added "${media.title}" to ${profile.name}'s List`,
        'Updated private screening list'
      );
      return updated;
    });
  };

  return (
    <CinemaShell>
      {/* Toast Notification System */}
      <Toast
        message={toastInfo?.message || ''}
        subtext={toastInfo?.subtext}
        type="sync"
        isVisible={Boolean(toastInfo)}
        onDismiss={() => setToastInfo(null)}
      />

      {/* Trailer Video Preview Modal */}
      <Modal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        kicker="Official Cinema Trailer"
        title={`${media.title} — 4K Atmos Preview`}
        description="Reference theatrical preview stream calibrated with uncompressed multichannel audio."
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-400/[0.12] flex items-center justify-center group shadow-2xl">
            {/* Backdrop preview representation */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 filter blur-[1px]"
              style={{ backgroundImage: `url(${media.backdropUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

            <div className="relative z-10 text-center space-y-3 p-6">
              <div className="w-16 h-16 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center mx-auto shadow-2xl transition-transform hover:scale-105">
                <Play className="w-7 h-7 fill-current ml-1" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">Theatrical Trailer Stream</p>
                <p className="text-xs text-slate-300">4K UHD • Dolby Atmos 7.1.4 Surround</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Director: {media.director}</span>
            <div className="flex items-center gap-2">
              <Badge variant="atmos" size="sm">Dolby Atmos</Badge>
              <Badge variant="uhd" size="sm">4K UHD</Badge>
            </div>
          </div>
        </div>
      </Modal>

      {/* Synchronized Watch Room Drawer */}
      <Drawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        kicker="Screening Room"
        title={`Sync & Play: ${media.title}`}
      >
        <div className="space-y-5">
          <div className="p-3.5 rounded-lg bg-[#111927] border border-slate-400/[0.12] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Private Room Active</span>
              <Badge variant="sync" size="sm">Connected</Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Avatar profile={profile} size="sm" />
                <span className="text-xs text-slate-200">{profile.name} (Host)</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar profile={companionProfile} size="sm" />
                <span className="text-xs text-slate-200">{companionProfile.name}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Invite sent to {companionProfile.name}. Both players will lockstep sync play, pause, and seek commands in 4K Atmos.
          </p>

          <Button
            variant="silver"
            size="md"
            fullWidth
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={() => {
              setIsSyncDrawerOpen(false);
              notify(`Launching synchronized screening of "${media.title}"`);
            }}
          >
            Launch Synchronized Stream
          </Button>
        </div>
      </Drawer>

      {/* Main Details Presentation Container */}
      <div className="relative min-h-screen">
        {/* Full Cinematic Backdrop Hero */}
        <div className="relative w-full min-h-[70vh] sm:min-h-[75vh] lg:min-h-[82vh] overflow-hidden">
          {/* Backdrop Image */}
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${media.backdropUrl})` }}
          >
            {/* Multi-angle cinematic scrims */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#06080d] via-[#06080d]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/60 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(6,8,13,0.92)_100%)]" />
          </motion.div>

          {/* Navigation Back Pill */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#090e17]/80 hover:bg-[#121927] border border-slate-400/[0.12] text-xs font-medium text-slate-300 hover:text-white transition-colors cinema-focus"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Browse</span>
            </button>
          </div>

          {/* Hero Content Information with Poster */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-16">
            <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
              {/* Poster Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="shrink-0 w-44 sm:w-56 md:w-64 lg:w-72 aspect-[2/3] rounded-xl overflow-hidden border border-slate-400/[0.18] shadow-[0_16px_48px_rgba(0,0,0,0.9)] bg-[#090e17] hidden sm:block"
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${media.posterUrl})` }}
                />
              </motion.div>

              {/* Information Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="space-y-5 max-w-3xl"
              >
                {/* Meta Bar */}
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
                  <span className="font-mono text-emerald-400 font-semibold">
                    {media.matchScore}% Match
                  </span>
                </div>

                {/* Title & Tagline */}
                <div>
                  {media.tagline && (
                    <p className="text-xs font-mono uppercase tracking-[0.25em] text-slate-400 mb-1">
                      {media.tagline}
                    </p>
                  )}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-tight">
                    {media.title}
                  </h1>
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-light">
                  {media.overview}
                </p>

                {/* Key Personnel & Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500 font-mono uppercase text-[10px] block">
                      Director
                    </span>
                    <span className="text-slate-200 font-medium">{media.director}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono uppercase text-[10px] block mb-1">
                      Screening Room Cache
                    </span>
                    <CacheStatus state={cacheState} />
                  </div>
                </div>

                {/* Audio & Video Badges */}
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
                  <Badge variant="silver" size="sm">
                    Subtitles [CC]
                  </Badge>
                </div>

                {/* Primary & Secondary Action Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  {/* ▶ Play */}
                  <Button
                    variant="silver"
                    size="lg"
                    icon={<Play className="w-4 h-4 fill-current" />}
                    onClick={() => router.push(`/watch/${media.id}`)}
                    id="movie-action-play"
                  >
                    Play
                  </Button>

                  {/* ⚡ Sync & Play */}
                  <SyncAndPlayButton
                    media={media}
                    variant="primary"
                    size="lg"
                    isGroupMode={true}
                  />

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
                    onClick={handleToggleSave}
                    id="movie-action-mylist"
                  >
                    {isSaved ? 'In My List' : 'My List'}
                  </Button>

                  {/* Trailer */}
                  <Button
                    variant="ghost"
                    size="lg"
                    icon={<Film className="w-4 h-4 text-slate-300" />}
                    onClick={() => setIsTrailerOpen(true)}
                    id="movie-action-trailer"
                  >
                    Trailer
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Extended Details Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 space-y-16 py-12">
          {/* Cast & Technical Specifications Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cast Section (2 cols) */}
            <GlassPanel variant="standard" padding="lg" className="lg:col-span-2 space-y-5">
              <SectionHeader
                kicker="Ensemble"
                title="Starring Cast"
                subtitle="Theatrical cast in order of reference billing."
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {media.cast?.map((actor, idx) => (
                  <div
                    key={actor}
                    className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.05] space-y-1"
                  >
                    <p className="text-xs font-medium text-white line-clamp-1">{actor}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {idx === 0 ? 'Lead Actor' : idx === 1 ? 'Co-Lead' : 'Key Role'}
                    </p>
                  </div>
                ))}
              </div>
            </GlassPanel>

            {/* Technical Specifications (1 col) */}
            <GlassPanel variant="standard" padding="lg" className="space-y-5">
              <SectionHeader
                kicker="Specifications"
                title="Audio & Subtitles"
                subtitle="Calibrated bitstream channels."
              />

              <div className="space-y-4 text-xs">
                {/* Audio Formats */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <span>Audio Tracks</span>
                  </div>
                  <div className="space-y-1.5 pl-6 font-mono text-[11px] text-slate-400">
                    {media.audioFormats?.map((af) => (
                      <div key={af} className="flex items-center justify-between">
                        <span>{af}</span>
                        <Badge variant="midnight" size="sm">Lossless</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtitle Languages */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Subtitles className="w-4 h-4 text-slate-400" />
                    <span>Subtitle Languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {media.subtitleLanguages?.map((sub) => (
                      <span
                        key={sub}
                        className="px-2 py-0.5 rounded bg-[#0d1421] border border-white/[0.06] text-[10px] font-mono text-slate-300"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Storage & Caching Details */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <span>Playback Infrastructure</span>
                  </div>
                  <p className="pl-6 text-[11px] text-slate-400 font-light">
                    Hosted on Oracle Cloud NVMe SSD cache with Google Drive master storage mirror.
                  </p>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* More Like This (Recommendation Grid) */}
          <section className="space-y-5">
            <SectionHeader
              kicker="Recommendations"
              title="More Like This"
              subtitle={`Curated recommendations matching "${media.title}" based on genres, tone, and cinematic scale.`}
              action={
                <span className="text-xs font-mono text-slate-500">
                  {similarMedia.length} Recommendations
                </span>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
              {similarMedia.map((sim) => (
                <MediaCard
                  key={sim.id}
                  media={sim}
                  aspectRatio="poster"
                  isSaved={savedIds.includes(sim.id)}
                  onToggleSave={() => {
                    setSavedIds((prev) =>
                      prev.includes(sim.id) ? prev.filter((i) => i !== sim.id) : [...prev, sim.id]
                    );
                    notify(
                      savedIds.includes(sim.id)
                        ? `Removed "${sim.title}" from list`
                        : `Saved "${sim.title}" to list`
                    );
                  }}
                  onPlay={() => router.push(`/movie/${sim.id}`)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </CinemaShell>
  );
}
