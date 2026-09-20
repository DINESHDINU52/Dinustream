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
import { ErrorState } from '@/components/ui/ErrorState';
import { useActiveProfile } from '@/hooks/useActiveProfile';
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
  Tv,
} from 'lucide-react';

export default function SeriesDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, companionProfile, myList, toggleMyList } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [similarSeries, setSimilarSeries] = useState<MediaItem[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      mediaService.getMediaById(id),
      mediaService.getSeasonsForSeries(id),
      mediaService.getSeries(10),
    ])
      .then(([m, s, allSeries]) => {
        if (!m) {
          setError('Series not found in private vault');
          setLoading(false);
          return;
        }
        setMedia(m);
        setSeasons(s);
        if (s.length > 0) {
          setSelectedSeasonNumber(s[0].seasonNumber);
        }

        const similar = allSeries
          .filter((item) => item.id !== m.id)
          .slice(0, 6);
        setSimilarSeries(similar);
      })
      .catch((err) => {
        console.error('[SeriesDetailsPage] Failed to fetch series:', err);
        setError('Unable to load series from media server');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isSaved = media ? myList.includes(media.id) : false;

  const activeSeason = useMemo(() => {
    return seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  }, [seasons, selectedSeasonNumber]);

  // Find the first unfinished episode or default to episode 1
  const resumeEpisode: Episode | undefined = useMemo(() => {
    for (const s of seasons) {
      const inProgress = s.episodes.find(
        (e) => (e.progressMinutes || 0) > 0 && (e.progressMinutes || 0) < (e.totalMinutes || 60)
      );
      if (inProgress) return inProgress;
    }
    return seasons[0]?.episodes[0];
  }, [seasons]);

  const notify = (message: string, subtext?: string) => {
    setToastInfo({ message, subtext });
    setTimeout(() => setToastInfo(null), 3500);
  };

  const handleToggleSave = () => {
    if (!media) return;
    const added = toggleMyList(media.id);
    notify(
      added ? `Added "${media.title}" to ${profile.name}'s List` : `Removed "${media.title}" from My List`,
      'Updated private screening list'
    );
  };

  if (loading) {
    return (
      <CinemaShell>
        <div className="min-h-[80vh] flex flex-col justify-center items-center gap-4">
          <div className="w-10 h-10 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Loading series presentation...
          </p>
        </div>
      </CinemaShell>
    );
  }

  if (error || !media) {
    return (
      <CinemaShell>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <ErrorState
            title="Series Unavailable"
            message={error || 'This series could not be located.'}
            onRetry={() => router.push('/')}
          />
          <div className="mt-6">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/')}
            >
              Return to Cinema Hall
            </Button>
          </div>
        </div>
      </CinemaShell>
    );
  }

  return (
    <CinemaShell>
      {/* Toast Notification */}
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
        kicker="Private Television Room"
        title="Sync & Stream Episodic"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0b101b] border border-slate-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Episodic Sync Ready</span>
              <Badge variant="sync" size="sm">Auto Skip Enabled</Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <Avatar profile={profile} size="sm" />
                <span className="text-xs text-slate-200">{profile.name} (Host)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar profile={companionProfile} size="sm" />
                <span className="text-xs text-slate-200">{companionProfile.name}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Starting synchronized playback will cue the selected episode on all connected companion screens.
          </p>

          {resumeEpisode && (
            <Button
              variant="primary"
              className="w-full justify-center"
              icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400" />}
              onClick={() => {
                setIsSyncDrawerOpen(false);
                router.push(`/watch/${resumeEpisode.id}?sync=true`);
              }}
            >
              Stream Ep {resumeEpisode.episodeNumber} in Sync
            </Button>
          )}
        </div>
      </Drawer>

      <div className="relative min-h-screen pb-24">
        {/* Back Button */}
        <div className="absolute top-6 left-4 sm:left-8 z-30">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#080d17]/80 hover:bg-[#121c2f] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-lg shadow-black/50 cinema-focus"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Hero Backdrop */}
        <div className="relative w-full h-[60vh] sm:h-[70vh] max-h-[750px] overflow-hidden">
          <img
            src={media.backdropUrl || media.posterUrl}
            alt={media.title}
            className="w-full h-full object-cover object-center filter brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-[#05070c]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070c] via-[#05070c]/40 to-transparent" />

          {/* Hero Overlay */}
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-12 z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl space-y-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="midnight" size="sm">
                  {media.releaseYear}
                </Badge>
                <Badge variant="midnight" size="sm">
                  {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
                </Badge>
                {media.rating && (
                  <Badge variant="midnight" size="sm">
                    {media.rating}
                  </Badge>
                )}
                {media.badges.map((b) => (
                  <Badge key={b} variant={b === 'Dolby Atmos' ? 'atmos' : 'silver'} size="sm">
                    {b}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {media.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-2xl line-clamp-3 sm:line-clamp-none">
                {media.overview}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {resumeEpisode && (
                  <Button
                    variant="silver"
                    size="md"
                    icon={<Play className="w-4 h-4 fill-current" />}
                    onClick={() => router.push(`/watch/${resumeEpisode.id}`)}
                  >
                    Play S{resumeEpisode.seasonNumber}:E{resumeEpisode.episodeNumber}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="md"
                  icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400" />}
                  onClick={() => setIsSyncDrawerOpen(true)}
                >
                  Watch in Sync
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  icon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                  onClick={handleToggleSave}
                >
                  {isSaved ? 'In My List' : 'Add to List'}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Seasons & Episodes Browser */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 mt-8 space-y-10">
          {seasons.length > 0 ? (
            <div className="space-y-6">
              {/* Season Selection Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.seasonNumber}
                      onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        selectedSeasonNumber === s.seasonNumber
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      Season {s.seasonNumber}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-400 hidden sm:block">
                  {activeSeason?.episodes.length || 0} Episodes Available
                </span>
              </div>

              {/* Episode Grid / Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSeason?.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => router.push(`/watch/${ep.id}`)}
                    className="group relative cursor-pointer rounded-2xl bg-[#0b101b] hover:bg-[#111928] border border-slate-800 hover:border-cyan-500/40 overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={ep.thumbnailUrl || media.backdropUrl}
                        alt={ep.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-90"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-11 h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300">
                        {ep.runtime}
                      </div>

                      {ep.progressMinutes && ep.totalMinutes && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                          <div
                            className="h-full bg-rose-500"
                            style={{
                              width: `${calculatePercentage(ep.progressMinutes, ep.totalMinutes)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Episode {ep.episodeNumber}</span>
                          {ep.progressMinutes ? (
                            <span className="text-cyan-400">In Progress</span>
                          ) : null}
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5">
                          {ep.title}
                        </h4>
                      </div>

                      {ep.overview && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Tv className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>Episodes are being indexed by the media server.</span>
            </div>
          )}

          {/* Similar Series */}
          {similarSeries.length > 0 && (
            <div className="space-y-4 pt-6">
              <SectionHeader
                title="More Television in the Vault"
                kicker="Recommended Series"
                subtitle="High-caliber episodic series for continuous viewing."
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similarSeries.map((item) => (
                  <MediaCard
                    key={item.id}
                    media={item}
                    aspectRatio="poster"
                    isSaved={myList.includes(item.id)}
                    onToggleSave={() => {
                      const added = toggleMyList(item.id);
                      notify(
                        added ? `Added "${item.title}" to My List` : `Removed "${item.title}" from My List`
                      );
                    }}
                    onPlay={() => router.push(`/series/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CinemaShell>
  );
}
