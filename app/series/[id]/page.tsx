'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { getMediaById, getSimilarMedia, MOCK_SERIES } from '@/lib/mock-data';
import { getSeasonsForSeries } from '@/lib/mock-series';
import { mediaService } from '@/lib/services/mediaService';
import { Episode, Season, MediaItem } from '@/types/cinema';
import { calculatePercentage } from '@/lib/utils';
import {
  Play,
  Zap,
  Plus,
  Check,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';

export default function SeriesDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, companionProfile } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [liveMedia, setLiveMedia] = useState<MediaItem | null>(null);
  const [liveSeasons, setLiveSeasons] = useState<Season[] | null>(null);

  useEffect(() => {
    if (id) {
      mediaService.getMediaById(id).then((m) => {
        if (m) setLiveMedia(m);
      }).catch(() => {});
      mediaService.getSeasonsForSeries(id).then((s) => {
        if (s && s.length > 0) setLiveSeasons(s);
      }).catch(() => {});
    }
  }, [id]);

  const fallbackMedia = useMemo(() => {
    if (!id) return MOCK_SERIES[0];
    const found = getMediaById(id);
    if (found) return found;
    return MOCK_SERIES.find((s) => s.id.toLowerCase().includes(id.toLowerCase())) || MOCK_SERIES[0];
  }, [id]);

  const media = liveMedia || fallbackMedia;

  const fallbackSeasons: Season[] = useMemo(() => {
    return getSeasonsForSeries(media.id);
  }, [media.id]);

  const seasons = liveSeasons || fallbackSeasons;

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [savedIds, setSavedIds] = useState<string[]>([
    'severance-s1',
    'succession',
    'shogun',
  ]);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

  const isSaved = savedIds.includes(media.id);

  const activeSeason = useMemo(() => {
    return seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  }, [seasons, selectedSeasonNumber]);

  // Find the last in-progress episode or the first episode
  const resumeEpisode: Episode = useMemo(() => {
    for (const season of seasons) {
      const inProgress = season.episodes.find(
        (e) => (e.progressMinutes || 0) > 0 && (e.progressMinutes || 0) < (e.totalMinutes || 60)
      );
      if (inProgress) return inProgress;
    }
    return seasons[0]?.episodes[0];
  }, [seasons]);

  const similarSeries = useMemo(() => {
    return getSimilarMedia(media.id, 6).filter((m) => m.id !== media.id);
  }, [media.id]);

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
        'Updated private screening watchlist'
      );
      return updated;
    });
  };

  const handlePlayEpisode = (ep: Episode, startOver = false) => {
    router.push(`/watch/${media.id}?episode=${ep.id}${startOver ? '&reset=1' : ''}`);
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

      {/* Synchronized Watch Room Drawer */}
      <Drawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        kicker="Screening Room"
        title={`Sync Stream: ${media.title}`}
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

          <div className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06] space-y-1">
            <p className="text-[10px] font-mono uppercase text-slate-400">Target Episode</p>
            <p className="text-xs font-medium text-white">
              S{resumeEpisode.seasonNumber}:E{resumeEpisode.episodeNumber} • {resumeEpisode.title}
            </p>
            <p className="text-[11px] text-slate-400">
              Duration: {resumeEpisode.runtime} • Subtitles [CC]
            </p>
          </div>

          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Invite delivered to {companionProfile.name}. Both viewers will synchronize play, pause, and skip markers.
          </p>

          <Button
            variant="silver"
            size="md"
            fullWidth
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={() => {
              setIsSyncDrawerOpen(false);
              notify(
                `Synchronized screening started with ${companionProfile.name}`,
                `S${resumeEpisode.seasonNumber}:E${resumeEpisode.episodeNumber} • "${resumeEpisode.title}"`
              );
            }}
          >
            Launch Synchronized Stream
          </Button>
        </div>
      </Drawer>

      {/* Main Series Presentation Container */}
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
                  <span className="font-mono text-slate-300">{seasons.length} Seasons</span>
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

                {/* Personnel & Resume Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500 font-mono uppercase text-[10px] block">
                      Starring Cast
                    </span>
                    <span className="text-slate-200 font-medium">
                      {media.cast?.slice(0, 4).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono uppercase text-[10px] block">
                      Playback Resume Marker
                    </span>
                    <span className="text-emerald-400 font-medium">
                      S{resumeEpisode.seasonNumber}:E{resumeEpisode.episodeNumber} • {resumeEpisode.title}
                    </span>
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
                  <Badge variant="midnight" size="sm">
                    Skip Intro Ready
                  </Badge>
                </div>

                {/* Primary Action Controls: Resume, Start Over, Sync & Play, My List */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  {/* ▶ Resume */}
                  <Button
                    variant="silver"
                    size="lg"
                    icon={<Play className="w-4 h-4 fill-current" />}
                    onClick={() => handlePlayEpisode(resumeEpisode, false)}
                    id="series-action-resume"
                  >
                    Resume S{resumeEpisode.seasonNumber}:E{resumeEpisode.episodeNumber}
                  </Button>

                  {/* ⟲ Start Over */}
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={<RotateCcw className="w-4 h-4 text-slate-300" />}
                    onClick={() => handlePlayEpisode(seasons[0].episodes[0], true)}
                    id="series-action-startover"
                  >
                    Start Over
                  </Button>

                  {/* ⚡ Sync & Play */}
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400" />}
                    onClick={() => setIsSyncDrawerOpen(true)}
                    id="series-action-sync"
                  >
                    Sync with {companionProfile.name}
                  </Button>

                  {/* ＋ My List */}
                  <Button
                    variant="ghost"
                    size="lg"
                    icon={
                      isSaved ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-300" />
                      )
                    }
                    onClick={handleToggleSave}
                    id="series-action-mylist"
                  >
                    {isSaved ? 'In My List' : 'My List'}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Extended Series Episodes & Seasons Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 space-y-16 py-8">
          {/* Season Selector Bar */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
              <div>
                <SectionHeader
                  kicker="Episodes"
                  title="Season Guide"
                  subtitle={`${activeSeason.title} • ${activeSeason.episodes.length} Episodes available in uncompressed 4K Atmos.`}
                />
              </div>

              {/* Season Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0d1421] border border-white/[0.06] overflow-x-auto shrink-0">
                {seasons.map((season) => {
                  const isActive = season.seasonNumber === selectedSeasonNumber;
                  return (
                    <button
                      key={season.seasonNumber}
                      onClick={() => setSelectedSeasonNumber(season.seasonNumber)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cinema-focus whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-[#070a10] shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {season.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Episode List Layout */}
            <div className="space-y-4">
              {activeSeason.episodes.map((episode) => {
                const percent = calculatePercentage(
                  episode.progressMinutes || 0,
                  episode.totalMinutes || 60
                );
                const isPartiallyWatched = percent > 0 && percent < 100;
                const isFullyWatched = percent >= 100;

                return (
                  <motion.div
                    key={episode.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.16 }}
                    className="p-4 sm:p-5 rounded-xl bg-[#090e17] border border-slate-400/[0.08] hover:border-slate-300/[0.22] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 group cinema-focus"
                  >
                    {/* Thumbnail Column with Play Overlay */}
                    <div
                      className="relative shrink-0 w-full md:w-56 lg:w-64 aspect-[16/9] rounded-lg overflow-hidden bg-black border border-white/[0.06] cursor-pointer"
                      onClick={() => handlePlayEpisode(episode, false)}
                    >
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${episode.thumbnailUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Play Button Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#06080d]/85 text-white border border-white/20 group-hover:bg-white group-hover:text-zinc-950 flex items-center justify-center shadow-lg transition-colors">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Number Badge Overlay */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono font-medium text-slate-300 border border-white/10">
                        EP {episode.episodeNumber}
                      </div>

                      {/* Runtime Badge Overlay */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300">
                        {episode.runtime}
                      </div>

                      {/* In-thumbnail Progress Bar */}
                      {isPartiallyWatched && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-slate-200"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Episode Description & Details Column */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 font-semibold">
                            {episode.episodeNumber}.
                          </span>
                          <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-slate-200 transition-colors">
                            {episode.title}
                          </h4>
                          {isFullyWatched && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                              Watched
                            </span>
                          )}
                          {isPartiallyWatched && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 text-[10px] font-mono">
                              {percent}%
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono text-slate-400">
                          {episode.runtime}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light line-clamp-2">
                        {episode.overview}
                      </p>

                      {isPartiallyWatched && (
                        <div className="pt-1 max-w-xs">
                          <ProgressBar progress={percent} size="xs" variant="silver" />
                        </div>
                      )}
                    </div>

                    {/* Episode Actions Column */}
                    <div className="shrink-0 flex md:flex-col items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                      <Button
                        variant={isPartiallyWatched ? 'silver' : 'primary'}
                        size="sm"
                        className="flex-1 md:flex-initial w-full"
                        icon={<Play className="w-3.5 h-3.5 fill-current" />}
                        onClick={() => handlePlayEpisode(episode, false)}
                      >
                        {isPartiallyWatched ? 'Resume' : 'Play'}
                      </Button>

                      {isPartiallyWatched && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 md:flex-initial w-full text-[11px]"
                          icon={<RotateCcw className="w-3 h-3 text-slate-400" />}
                          onClick={() => handlePlayEpisode(episode, true)}
                        >
                          Restart
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* More Like This (Series Recommendations) */}
          <section className="space-y-5">
            <SectionHeader
              kicker="Recommendations"
              title="More Like This"
              subtitle={`Curated series matching "${media.title}" based on prestige narrative, tone, and character scale.`}
              action={
                <span className="text-xs font-mono text-slate-500">
                  {similarSeries.length} Series
                </span>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
              {similarSeries.map((sim) => (
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
                  onPlay={() => {
                    if (sim.type === 'series') {
                      router.push(`/series/${sim.id}`);
                    } else {
                      router.push(`/movie/${sim.id}`);
                    }
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </CinemaShell>
  );
}
