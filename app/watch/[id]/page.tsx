'use client';

import React, { useMemo, Suspense, useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CinemaPlayer } from '@/components/player/CinemaPlayer';
import { Badge } from '@/components/ui/Badge';
import { CacheStatus } from '@/components/sync/CacheStatus';
import { getSyncStatus, SyncState } from '@/lib/api/syncManager';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { Episode, MediaItem, Season } from '@/types/cinema';
import { GroupChat } from '@/components/chat/GroupChat';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles } from 'lucide-react';

/** Default room used when no `group` query param is supplied. */
const DEFAULT_GROUP_ID = 'group-movie-night';
const DEFAULT_GROUP_NAME = 'Movie Night ❤️';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { companionProfile } = useActiveProfile();
  const [cacheState, setCacheState] = useState<SyncState>('not_cached');
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const episodeId = searchParams.get('episode');
  const isSyncMode = searchParams.get('sync') === 'true';
  const groupId = searchParams.get('group') || DEFAULT_GROUP_ID;

  const loadSession = useCallback(async (mediaId: string) => {
    setLoading(true);
    setError(null);
    try {
      /*
        Sequential on purpose. These used to run in a `Promise.all`, which meant
        `getSeasonsForSeries` was called for movies too — and Jellyfin answers
        `/Shows/{movieId}/Seasons` and `/Shows/{movieId}/Episodes` with 404. The
        service swallowed them so playback still worked, but every movie logged
        two upstream 404s and two error traces to the console, which buried the
        real diagnostics.
      */
      const item = await mediaService.getMediaById(mediaId);

      if (!item) {
        setError('Media not found in private vault');
        return;
      }
      setMedia(item);

      const seasonList =
        item.type === 'series' ? await mediaService.getSeasonsForSeries(mediaId) : [];
      setSeasons(seasonList || []);
    } catch (err) {
      console.error('[WatchPage] Error loading item:', err);
      setError('Failed to load playback session');
    } finally {
      setLoading(false);
    }
  }, []);

  /*
    Deferred a microtask so the synchronous `setLoading(true)` inside
    `loadSession` does not run in the effect body (react-hooks/
    set-state-in-effect).
  */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadSession(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id, loadSession]);

  const allEpisodes: Episode[] = useMemo(() => {
    return seasons.flatMap((s) => s.episodes);
  }, [seasons]);

  // Current Episode
  const currentEpisode: Episode | undefined = useMemo(() => {
    if (allEpisodes.length === 0) return undefined;
    if (episodeId) {
      const found = allEpisodes.find((e) => e.id === episodeId);
      if (found) return found;
    }
    return allEpisodes[0];
  }, [allEpisodes, episodeId]);

  /* Poll the local cache state for the active file. Guarded against a late
     response arriving after the user has already switched episodes. */
  useEffect(() => {
    if (!media) return;
    let cancelled = false;
    const filename = currentEpisode ? `${currentEpisode.id}.mkv` : `${media.id}.mkv`;

    getSyncStatus(filename)
      .then((res) => {
        if (!cancelled) setCacheState(res.state);
      })
      .catch(() => {
        if (!cancelled) setCacheState('not_cached');
      });

    return () => {
      cancelled = true;
    };
  }, [media, currentEpisode]);

  const currentIndex = currentEpisode
    ? allEpisodes.findIndex((e) => e.id === currentEpisode.id)
    : -1;

  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : undefined;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? allEpisodes[currentIndex + 1]
      : undefined;

  const handleNext = () => {
    if (nextEpisode && media) {
      router.push(`/watch/${media.id}?episode=${nextEpisode.id}`);
    }
  };

  const handlePrev = () => {
    if (prevEpisode && media) {
      router.push(`/watch/${media.id}?episode=${prevEpisode.id}`);
    }
  };

  const handleSelectEpisode = (epId: string) => {
    if (media) {
      router.push(`/watch/${media.id}?episode=${epId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-dynamic bg-black flex flex-col justify-center items-center text-white px-4 text-center">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
          Initializing Cinema Session...
        </p>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen-dynamic bg-[#05070c] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="Stream Unavailable"
            message={error || 'Could not find this title in the library.'}
            onRetry={() => (id ? loadSession(id) : router.push('/'))}
          />
          <div className="mt-6 text-center">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/')}
            >
              Back to Catalog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen-dynamic bg-[#05080f] text-white flex flex-col selection:bg-rose-500/30">
      {/*
        Floating player chrome. `pt-safe-flush`/`px-safe` keep the exit button
        and the sync badge out of the notch and the rounded-display corners now
        that the document viewport is `viewportFit: 'cover'`.
      */}
      <header className="absolute top-0 inset-x-0 z-40 flex items-start justify-between gap-2 p-3 sm:p-6 pt-safe-flush px-safe bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full bg-[#0a0f18]/80 hover:bg-[#141f32] border border-slate-400/[0.12] text-xs font-medium text-slate-300 hover:text-white transition-all backdrop-blur-md cinema-focus shrink-0"
          aria-label="Exit to cinema hall"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden min-[380px]:inline">Exit Screen</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto min-w-0">
          {isSyncMode && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] sm:text-xs font-medium shadow-[0_0_12px_rgba(244,63,94,0.3)] min-w-0">
              <Sparkles className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
              {/* Companion name is dropped on narrow screens so the pill cannot
                  collide with the exit button. */}
              <span className="truncate">
                <span className="sm:hidden">In sync</span>
                <span className="hidden sm:inline">Syncing with {companionProfile.name}</span>
              </span>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2">
            <CacheStatus state={cacheState} />
          </div>
        </div>
      </header>

      {/* Player */}
      <main className="flex flex-col justify-center">
        <CinemaPlayer
          media={media}
          episode={currentEpisode}
          nextEpisode={nextEpisode}
          prevEpisode={prevEpisode}
          onNextEpisode={handleNext}
          onPrevEpisode={handlePrev}
          autoPlay
          seasons={seasons}
          onSelectEpisode={handleSelectEpisode}
          isGroupSync={isSyncMode}
          groupId={groupId}
          groupName={DEFAULT_GROUP_NAME}
          /* Dedicated playback route: fill the screen instead of letterboxing
             a 16:9 box inside it. */
          fillViewport
        />
      </main>

      {/* Watch Together live chat */}
      {isSyncMode && <GroupChat groupId={groupId} groupName={DEFAULT_GROUP_NAME} />}

      {/* Feature context tray */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white break-words">
                {media.title}
              </h1>
              {currentEpisode && (
                <Badge variant="sync" size="sm">
                  S{currentEpisode.seasonNumber}:E{currentEpisode.episodeNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 font-light mt-1.5 max-w-2xl">
              {currentEpisode ? currentEpisode.overview || media.overview : media.overview}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {media.badges.map((b) => (
              <Badge
                key={b}
                variant={b === 'Dolby Atmos' || b === 'Spatial Audio' ? 'atmos' : 'midnight'}
                size="sm"
              >
                {b}
              </Badge>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function WatchPage() {
  return (
    /* `useSearchParams` requires a Suspense boundary during prerendering. */
    <Suspense fallback={<div className="min-h-screen-dynamic bg-[#05080f]" />}>
      <WatchContent />
    </Suspense>
  );
}
