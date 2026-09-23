'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { Episode, Season, MediaItem } from '@/types/cinema';
import { calculatePercentage, cn } from '@/lib/utils';
import { Play, Plus, Check, ArrowLeft, Tv, Zap } from 'lucide-react';

/** Shared horizontal gutters, consistent with the home page rails. */
const GUTTER = 'px-4 sm:px-8 lg:px-12';

const TOAST_MS = 3500;

export default function SeriesDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, myList, toggleMyList } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [similarSeries, setSimilarSeries] = useState<MediaItem[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [backdropError, setBackdropError] = useState(false);

  const loadSeries = useCallback(async (seriesId: string) => {
    setLoading(true);
    setError(null);
    setBackdropError(false);
    try {
      const [item, seasonList, allSeries] = await Promise.all([
        mediaService.getMediaById(seriesId),
        mediaService.getSeasonsForSeries(seriesId),
        mediaService.getSeries(10),
      ]);

      if (!item) {
        setError('Series not found in private vault');
        return;
      }

      setMedia(item);
      setSeasons(seasonList);
      if (seasonList.length > 0) setSelectedSeasonNumber(seasonList[0].seasonNumber);
      setSimilarSeries(allSeries.filter((s) => s.id !== item.id).slice(0, 6));
    } catch (err) {
      console.error('[SeriesDetailsPage] Failed to fetch series:', err);
      setError('Unable to load series from media server');
    } finally {
      setLoading(false);
    }
  }, []);

  /*
    Deferred a microtask so the synchronous `setLoading(true)` inside
    `loadSeries` does not execute in the effect body (react-hooks/
    set-state-in-effect: it forces a cascading render before first paint).
  */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadSeries(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id, loadSeries]);

  useEffect(() => {
    if (!toastInfo) return;
    const timer = setTimeout(() => setToastInfo(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toastInfo]);

  useEffect(() => {
    if (seasons.length > 0 && !seasons.some((s) => s.seasonNumber === selectedSeasonNumber)) {
      setSelectedSeasonNumber(seasons[0].seasonNumber);
    }
  }, [seasons, selectedSeasonNumber]);

  const isSaved = media ? myList.includes(media.id) : false;

  const activeSeason = useMemo(
    () => seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0],
    [seasons, selectedSeasonNumber]
  );

  // First partially-watched episode, else the very first episode.
  const resumeEpisode: Episode | undefined = useMemo(() => {
    for (const season of seasons) {
      const inProgress = season.episodes.find(
        (e) => (e.progressMinutes || 0) > 0 && (e.progressMinutes || 0) < (e.totalMinutes || 60)
      );
      if (inProgress) return inProgress;
    }
    return seasons[0]?.episodes[0];
  }, [seasons]);

  const notify = (message: string, subtext?: string) => setToastInfo({ message, subtext });

  /**
   * Build a watch URL for an episode.
   *
   * The watch route resolves the *series* from its path segment and the episode
   * from the `episode` query param — that is what gives the player its season
   * list, prev/next navigation, the S:E badge and autoplay-next. This page used
   * to link straight to `/watch/<episodeId>`, so `getSeasonsForSeries` was
   * called with an episode id, returned nothing, and every one of those features
   * silently disappeared.
   */
  const episodeHref = (episode: Episode) => {
    const seriesId = media?.id ?? id;
    const query = new URLSearchParams({ episode: episode.id, sync: 'true' });
    return `/watch/${seriesId}?${query.toString()}`;
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
        <MediaDetailsSkeleton />
      </CinemaShell>
    );
  }

  if (error || !media) {
    return (
      <CinemaShell>
        <div className="max-w-2xl mx-auto px-4 pt-navbar pb-16 text-center">
          <ErrorState
            title="Series Unavailable"
            message={error || 'This series could not be located.'}
            onRetry={() => (id ? loadSeries(id) : router.push('/'))}
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

  const backdrop = backdropError ? media.posterUrl : media.backdropUrl || media.posterUrl;

  return (
    <CinemaShell>
      <Toast
        message={toastInfo?.message || ''}
        subtext={toastInfo?.subtext}
        type="sync"
        isVisible={Boolean(toastInfo)}
        onDismiss={() => setToastInfo(null)}
      />


      <div className="relative">
        {/* Back button */}
        <div className={cn('absolute top-[calc(var(--cinema-navbar-height)+env(safe-area-inset-top,0px)+0.75rem)] left-0 z-30', GUTTER)}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) router.back();
              else router.push('/');
            }}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-[#080d17]/90 hover:bg-[#121c2f] border border-white/[0.15] text-xs font-medium text-slate-200 hover:text-white backdrop-blur-2xl transition-all shadow-[0_4px_24px_rgba(0,0,0,0.7)] cinema-focus active:scale-95"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </div>

        {/*
          Hero. Same fix as the movie page: the title block is in normal flow and
          pulled up over the backdrop gradient instead of being `absolute
          bottom-0` inside a fixed-height `overflow-hidden` box, where taller
          content (badges + title + synopsis + three buttons) was clipped off the
          top on phones.
        */}
        <div className="relative h-[46svh] min-h-[280px] sm:h-[56svh] lg:h-[66svh] lg:max-h-[750px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            decoding="async"
            onError={() => setBackdropError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* See the movie detail page: brightness filters dim the whole frame,
              so contrast is applied only where the copy sits. */}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#05070c] via-[#05070c]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070c]/85 via-[#05070c]/25 to-transparent" />
        </div>

        <div className={cn('relative z-20 max-w-7xl mx-auto -mt-24 sm:-mt-32 lg:-mt-44', GUTTER)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl space-y-3 sm:space-y-4"
          >
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                <Badge
                  key={b}
                  variant={b === 'Dolby Atmos' || b === 'Spatial Audio' ? 'atmos' : 'silver'}
                  size="sm"
                >
                  {b}
                </Badge>
              ))}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight text-on-art-strong">
              {media.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-2xl line-clamp-4 sm:line-clamp-none">
              {media.overview}
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 pt-2">
              {resumeEpisode && (
                <Button
                  variant="silver"
                  size="lg"
                  icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400" />}
                  onClick={() => router.push(episodeHref(resumeEpisode))}
                  className="w-full sm:w-auto justify-center"
                >
                  Sync &amp; Play S{resumeEpisode.seasonNumber}:E{resumeEpisode.episodeNumber}
                </Button>
              )}


              <Button
                variant="secondary"
                size="lg"
                icon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                onClick={handleToggleSave}
                className="w-full sm:w-auto justify-center"
              >
                {isSaved ? 'In My List' : 'Add to List'}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Seasons & episodes browser */}
        <div className={cn('max-w-7xl mx-auto mt-10 sm:mt-12 space-y-10', GUTTER)}>
          {seasons.length > 0 ? (
            <div className="space-y-6">
              {/* Season tabs — scrollable so a long-running show never overflows */}
              <div className="flex items-end justify-between gap-4 border-b border-slate-800 pb-4">
                <div
                  className="cinema-rail flex items-center gap-2 overflow-x-auto no-scrollbar -mb-px pb-1 min-w-0"
                  role="tablist"
                  aria-label="Seasons"
                >
                  {seasons.map((s) => {
                    const isActive = selectedSeasonNumber === s.seasonNumber;
                    return (
                      <button
                        key={s.seasonNumber}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                        className={cn(
                          'shrink-0 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus',
                          isActive
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                        )}
                      >
                        {s.title && !s.title.toLowerCase().includes('unknown') ? s.title : `Season ${s.seasonNumber}`}
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs text-slate-400 hidden md:block shrink-0">
                  {activeSeason?.episodes.length || 0} Episodes Available
                </span>
              </div>

              {/* Episode cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeSeason?.episodes.map((ep) => {
                  const progressPct =
                    ep.progressMinutes && ep.totalMinutes
                      ? calculatePercentage(ep.progressMinutes, ep.totalMinutes)
                      : 0;

                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => router.push(episodeHref(ep))}
                      /* A real <button> replaces the previous clickable <div>,
                         which had no keyboard or screen-reader affordance. */
                      className="group relative text-left cursor-pointer rounded-2xl bg-[#0b101b] hover:bg-[#111928] border border-slate-800 hover:border-cyan-500/40 overflow-hidden transition-all duration-300 flex flex-col shadow-md cinema-focus"
                      aria-label={`Play episode ${ep.episodeNumber}: ${ep.title}`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ep.thumbnailUrl || media.backdropUrl || media.posterUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (media.backdropUrl && target.src !== media.backdropUrl) {
                              target.src = media.backdropUrl;
                            } else if (media.posterUrl && target.src !== media.posterUrl) {
                              target.src = media.posterUrl;
                            }
                          }}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Thumbnails are shown at full brightness; the previous
                            `brightness-90` plus a flat `bg-black/30` veil made
                            every episode still look washed out. */}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />

                        {/* Play affordance: always visible on touch, hover-revealed for pointers */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="w-11 h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 opacity-0 group-hover:opacity-100 transition-opacity motion-safe:duration-200 max-[1023px]:opacity-90">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </span>
                        </div>

                        {ep.runtime && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300">
                            {ep.runtime}
                          </span>
                        )}

                        {progressPct > 0 && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60">
                            <div className="h-full bg-rose-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 sm:p-4 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                          <span>Episode {ep.episodeNumber}</span>
                          {progressPct > 0 && <span className="text-cyan-400">In Progress</span>}
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {ep.title}
                        </h4>
                        {ep.overview && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Tv className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>Episodes are being indexed by the media server.</span>
            </div>
          )}

          {/* Similar series */}
          {similarSeries.length > 0 && (
            <div className="space-y-4 pt-6">
              <SectionHeader
                title="More Television in the Vault"
                kicker="Recommended Series"
                subtitle="High-caliber episodic series for continuous viewing."
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {similarSeries.map((item) => (
                  <MediaCard
                    key={item.id}
                    media={item}
                    aspectRatio="poster"
                    isSaved={myList.includes(item.id)}
                    onToggleSave={() => {
                      const added = toggleMyList(item.id);
                      notify(
                        added
                          ? `Added "${item.title}" to My List`
                          : `Removed "${item.title}" from My List`
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
