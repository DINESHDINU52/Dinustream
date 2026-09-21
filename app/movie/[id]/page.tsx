'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Drawer } from '@/components/ui/Drawer';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton } from '@/components/sync';
import { cn } from '@/lib/utils';
import { Play, Plus, Check, Film, ArrowLeft, Volume2, Subtitles, Sparkles } from 'lucide-react';

/** Shared horizontal gutters, consistent with the home page rails. */
const GUTTER = 'px-4 sm:px-8 lg:px-12';

const TOAST_MS = 3500;

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, companionProfile, myList, toggleMyList } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [similarMovies, setSimilarMovies] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  const loadMovie = useCallback(async (movieId: string) => {
    setLoading(true);
    setError(null);
    setBackdropError(false);
    try {
      const item = await mediaService.getMediaById(movieId);
      if (!item) {
        setError('Movie not found in your private vault');
        return;
      }
      setMedia(item);

      const allMovies = await mediaService.getMovies(20).catch(() => []);
      setSimilarMovies(allMovies.filter((m) => m.id !== item.id).slice(0, 6));
    } catch (err) {
      console.error('[MovieDetailsPage] Failed to fetch movie:', err);
      setError('Unable to load movie details from server');
    } finally {
      setLoading(false);
    }
  }, []);

  /*
    Deferred one tick so the synchronous `setLoading(true)` inside `loadMovie`
    does not run inside the effect body — React treats that as a cascading
    render (react-hooks/set-state-in-effect).
  */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadMovie(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id, loadMovie]);

  useEffect(() => {
    if (!toastInfo) return;
    const timer = setTimeout(() => setToastInfo(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toastInfo]);

  const isSaved = media ? myList.includes(media.id) : false;

  const notify = (message: string, subtext?: string) => setToastInfo({ message, subtext });

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
        <div className="min-h-[70svh] flex flex-col justify-center items-center gap-4 px-4 text-center">
          <div className="w-10 h-10 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Loading movie presentation...
          </p>
        </div>
      </CinemaShell>
    );
  }

  if (error || !media) {
    return (
      <CinemaShell>
        <div className="max-w-2xl mx-auto px-4 pt-navbar pb-16 text-center">
          <ErrorState
            title="Feature Unavailable"
            message={error || 'This title could not be found.'}
            onRetry={() => (id ? loadMovie(id) : router.push('/'))}
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

      {/* Synchronized screening room drawer */}
      <Drawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        kicker="Private Screening Room"
        title="Sync & Play Together"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0b101b] border border-slate-700/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">Live Session Ready</span>
              <Badge variant="sync" size="sm">
                Sub-100ms Sync
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5">
                <Avatar profile={profile} size="sm" />
                <div>
                  <p className="text-xs font-medium text-slate-200">{profile.name}</p>
                  <p className="text-[10px] text-cyan-400">Host</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar profile={companionProfile} size="sm" />
                <div>
                  <p className="text-xs font-medium text-slate-200">{companionProfile.name}</p>
                  <p className="text-[10px] text-rose-400">Companion</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Launching starts playback on both screens simultaneously, syncing play, pause and seek
            events with drift correction.
          </p>

          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => {
              setIsSyncDrawerOpen(false);
              router.push(`/watch/${media.id}?sync=true`);
            }}
          >
            Launch Synchronized Stream
          </Button>
        </div>
      </Drawer>

      <div className="relative">
        {/* Back button — sits below the fixed navbar, clear of the notch */}
        <div className={cn('absolute top-[calc(var(--cinema-navbar-height)+env(safe-area-inset-top,0px)+0.75rem)] z-30', GUTTER, 'left-0')}>
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
          Hero.

          The title block used to be `absolute bottom-0` inside a fixed-height,
          `overflow-hidden` hero. On a phone the badges + title + tagline +
          synopsis + three buttons are taller than 65vh, so the content grew
          upwards and was simply clipped — the Play button was unreachable.

          It now lives in normal document flow and is pulled up over the
          backdrop's bottom gradient with a negative margin, so the hero can
          never clip its own content at any viewport size.
        */}
        <div className="relative h-[46svh] min-h-[280px] sm:h-[56svh] lg:h-[68svh] lg:max-h-[760px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            decoding="async"
            onError={() => setBackdropError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/*
            No `brightness-[0.75]` filter and no full-bleed gradients. A
            brightness filter dims the *entire* frame uniformly — including the
            areas with no text over them — which is what made the artwork look
            muddy and low-contrast. Contrast where it is actually needed comes
            from a bottom-anchored scrim plus a narrow left wash instead.
          */}
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
              {media.runtime && (
                <Badge variant="midnight" size="sm">
                  {media.runtime}
                </Badge>
              )}
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

            {media.tagline && (
              <p className="text-sm sm:text-base font-medium text-cyan-400/90 tracking-wide italic">
                &ldquo;{media.tagline}&rdquo;
              </p>
            )}

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-2xl line-clamp-4 sm:line-clamp-none">
              {media.overview}
            </p>

            {/* Actions stack full-width on phones so every target clears 44px */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 pt-2">
              <Button
                variant="silver"
                size="lg"
                icon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => router.push(`/watch/${media.id}`)}
                className="w-full sm:w-auto justify-center"
              >
                Play Feature
              </Button>

              <SyncAndPlayButton
                media={media}
                variant="primary"
                size="lg"
                isGroupMode
                onBeforeSync={() => setIsSyncDrawerOpen(true)}
                className="w-full sm:w-auto justify-center"
              />

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

        {/* Technical specs & recommendations */}
        <div className={cn('max-w-7xl mx-auto mt-10 sm:mt-12 space-y-10 sm:space-y-12', GUTTER)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <GlassPanel variant="standard" padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Audio Streams</span>
              </div>
              <p className="text-sm font-semibold text-white break-words">
                {media.audioFormats && media.audioFormats.length > 0
                  ? media.audioFormats.join(' • ')
                  : 'Stereo / Surround Sound'}
              </p>
              <p className="text-xs text-slate-400">
                Direct streamed bitstream without lossy downmixing.
              </p>
            </GlassPanel>

            <GlassPanel variant="standard" padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Subtitles className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Subtitle Tracks</span>
              </div>
              <p className="text-sm font-semibold text-white break-words">
                {media.subtitleLanguages && media.subtitleLanguages.length > 0
                  ? media.subtitleLanguages.join(' • ')
                  : 'Subtitles Available'}
              </p>
              <p className="text-xs text-slate-400">
                Synchronized subtitle tracks embedded in container.
              </p>
            </GlassPanel>

            <GlassPanel variant="standard" padding="md" className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Genres &amp; Cast</span>
              </div>
              <p className="text-sm font-semibold text-white break-words">
                {media.genres.length > 0 ? media.genres.join(', ') : 'Feature Cinema'}
              </p>
              {/* `truncate` clipped the cast to a single unreadable line; two
                  clamped lines fit the panel without hiding every name. */}
              <p className="text-xs text-slate-400 line-clamp-2">
                {media.cast && media.cast.length > 0
                  ? `Starring: ${media.cast.join(', ')}`
                  : 'Private vault selection'}
              </p>
            </GlassPanel>
          </div>

          {similarMovies.length > 0 && (
            <div className="space-y-4">
              <SectionHeader
                title="More Titles from the Vault"
                kicker="Recommended Presentations"
                subtitle="Curated companion features with matching cinematic attributes."
              />
              {/* 3 columns on the smallest phones keeps posters legible without
                  the 2-up layout's oversized cards. */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {similarMovies.map((item) => (
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
                    onPlay={() => router.push(`/movie/${item.id}`)}
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
