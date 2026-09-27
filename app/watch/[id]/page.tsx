'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CinemaPlayer } from '@/components/player/CinemaPlayer';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { MediaItem, Episode, Season } from '@/types/cinema';
import { fetchRawItem, fetchEpisodes, fetchItemFilename, isDolbyItem } from '@/lib/jellyfin/queries';
import { mapToMediaItem, mapToEpisode } from '@/lib/jellyfin/mappers';
import { startSync, getSyncStatus } from '@/lib/api/syncManager';
import { DolbyAdOverlay } from '@/components/sync/DolbyAdOverlay';
import { Loader2, AlertTriangle, HardDriveDownload, CheckCircle2 } from 'lucide-react';

function groupEpisodes(episodes: Episode[]): Season[] {
  const map = new Map<number, Episode[]>();
  for (const e of episodes) {
    const arr = map.get(e.seasonNumber) ?? [];
    arr.push(e);
    map.set(e.seasonNumber, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([seasonNumber, eps]) => ({
      seasonNumber,
      title: `Season ${seasonNumber}`,
      episodeCount: eps.length,
      episodes: eps.sort((a, b) => a.episodeNumber - b.episodeNumber),
    }));
}

function pickEpisode(flat: Episode[], seasonParam?: string | null, episodeParam?: string | null): Episode | undefined {
  if (flat.length === 0) return undefined;
  if (seasonParam && episodeParam) {
    const sn = parseInt(seasonParam, 10);
    const en = parseInt(episodeParam, 10);
    const found = flat.find((e) => e.seasonNumber === sn && e.episodeNumber === en);
    if (found) return found;
  }
  return flat[0];
}

/*
  The preshow ad runs on the FIRST run of a title only. Cache state alone is not
  enough: if the viewer reopens before the Drive->SSD copy finishes, the title is
  still "not cached" and the ad would replay. A per-title flag makes it strictly
  once. (Keyed by item id; clearing site data resets it.)
*/
const AD_SEEN_PREFIX = 'dinustream:ad-seen:';

function hasSeenAd(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AD_SEEN_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

function markAdSeen(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AD_SEEN_PREFIX + id, '1');
  } catch {
    /* private mode / storage disabled — the cache check still gates the ad */
  }
}

function WatchContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGroupSync = searchParams.get('sync') === 'true';
  const groupId = searchParams.get('group') || 'group-movie-night';
  /*
    `?sync=true` is appended to *every* normal movie play (see playItem), so it
    cannot mean "watch party". A real party carries a `room`/`group` invite param.
    Only that should suppress the first-run ad — an ad mid-party would desync it.
  */
  const isWatchParty = searchParams.has('room') || searchParams.has('group');

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [episode, setEpisode] = useState<Episode | undefined>();
  const [seasons, setSeasons] = useState<Season[] | undefined>();
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [nextEpisode, setNextEpisode] = useState<Episode | undefined>();
  const [prevEpisode, setPrevEpisode] = useState<Episode | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /*
    First-run gate:
      checking -> we're deciding whether this title is already on the SSD
      ad       -> not cached yet: play a random Dolby clip fully while the
                  Python daemon pulls it from Drive to SSD
      play     -> cached / Dolby / group sync / non-movie: go straight in
  */
  const [gate, setGate] = useState<'checking' | 'ad' | 'play'>('checking');
  const [isDolby, setIsDolby] = useState(false);
  const [isMovie, setIsMovie] = useState(false);

  // Decide the first-run gate for the *movie* being opened:
  //  - already on NVMe (or a permanent Dolby title) -> straight to playback
  //  - otherwise -> kick the Drive->SSD copy and play a Dolby ad meanwhile.
  // Episodes and group (watch-party) playback always skip the ad.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === '1') {
      setGate('play');
      return;
    }
    if (loading) return; // wait until we know whether this item is a movie
    let cancelled = false;
    (async () => {
      try {
        const dolby = await isDolbyItem(id).catch(() => false);
        if (cancelled) return;
        setIsDolby(dolby);
        if (dolby) {
          setGate('play');
          return;
        }

        const filename = await fetchItemFilename(id).catch(() => null);
        if (cancelled) return;
        // Kick the background Drive -> SSD copy regardless of the ad path, so
        // the next watch is instant.
        if (filename) void startSync(filename, isMovie ? 'movie' : 'show').catch(() => {});

        if (!isMovie || isWatchParty || !filename || hasSeenAd(id)) {
          setGate('play');
          return;
        }

        // Already cached? Skip the ad and play instantly.
        const status = await getSyncStatus(filename).catch(() => null);
        if (cancelled) return;
        if (status && (status.state === 'ready' || status.percentage >= 100)) {
          setGate('play');
          return;
        }
        // First run: remember it so the ad never plays for this title again,
        // even if the SSD copy is still in flight next time.
        markAdSeen(id);
        setGate('ad');
      } catch {
        if (!cancelled) setGate('play');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loading, isMovie, isWatchParty]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const raw = await fetchRawItem(id);
        if (cancelled) return;
        if (!raw) {
          setError('This title could not be found.');
          return;
        }

        if (raw.Type === 'Movie') {
          setMedia(mapToMediaItem(raw));
          setEpisode(undefined);
          setSeasons(undefined);
          setIsMovie(true);
        } else if (raw.Type === 'Episode') {
          setIsMovie(false);
          const seriesId = raw.SeriesId;
          const [seriesRaw, eps] = await Promise.all([
            seriesId ? fetchRawItem(seriesId).catch(() => null) : Promise.resolve(null),
            seriesId ? fetchEpisodes(seriesId).catch(() => []) : Promise.resolve([]),
          ]);
          if (cancelled) return;
          const flat = eps.map(mapToEpisode);
          const idx = flat.findIndex((e) => e.id === id);
          setMedia(seriesRaw ? mapToMediaItem(seriesRaw) : mapToMediaItem(raw));
          setEpisode(mapToEpisode(raw));
          setSeasons(groupEpisodes(flat));
          setAllEpisodes(flat);
          setPrevEpisode(idx > 0 ? flat[idx - 1] : undefined);
          setNextEpisode(idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : undefined);
        } else {
          setIsMovie(false);
          const eps = await fetchEpisodes(id).catch(() => []);
          if (cancelled) return;
          const flat = eps.map(mapToEpisode);
          const chosen = pickEpisode(flat, searchParams.get('season'), searchParams.get('episode'));
          setMedia(mapToMediaItem(raw));
          setSeasons(groupEpisodes(flat));
          setAllEpisodes(flat);
          setEpisode(chosen);
          const idx = chosen ? flat.findIndex((e) => e.id === chosen.id) : -1;
          setPrevEpisode(idx > 0 ? flat[idx - 1] : undefined);
          setNextEpisode(idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : undefined);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load playback');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSelectEpisode = useCallback(
    (episodeId: string) => {
      const idx = allEpisodes.findIndex((e) => e.id === episodeId);
      if (idx < 0) return;
      setEpisode(allEpisodes[idx]);
      setPrevEpisode(idx > 0 ? allEpisodes[idx - 1] : undefined);
      setNextEpisode(idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : undefined);
    },
    [allEpisodes]
  );

  const handleNextEpisode = useCallback(() => {
    if (nextEpisode) {
      const q = isGroupSync ? `?sync=true&group=${encodeURIComponent(groupId)}` : '';
      router.replace(`/watch/${nextEpisode.id}${q}`);
    }
  }, [nextEpisode, router, isGroupSync, groupId]);

  const handlePrevEpisode = useCallback(() => {
    if (prevEpisode) {
      const q = isGroupSync ? `?sync=true&group=${encodeURIComponent(groupId)}` : '';
      router.replace(`/watch/${prevEpisode.id}${q}`);
    }
  }, [prevEpisode, router, isGroupSync, groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center">
        <MediaDetailsSkeleton />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-[#06080d] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <h2 className="text-xl font-bold text-white">Playback unavailable</h2>
        <p className="text-slate-400 text-sm max-w-md">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-semibold"
        >
          Back to catalog
        </button>
      </div>
    );
  }

  // First run, not on the SSD yet: play one random Dolby clip fully while the
  // Python daemon pulls the movie from Drive to SSD. Skip is always available.
  if (gate === 'ad') {
    return <DolbyAdOverlay media={media} onComplete={() => setGate('play')} />;
  }

  // Brief "Preparing your stream" prelude while we resolve the cache state, so
  // the ffmpeg/HLS warm-up feels like an intentional transition instead of a hang.
  if (gate === 'checking') {
    return (
      <div className="relative min-h-screen bg-[#06080d] flex flex-col items-center justify-center select-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.backdropUrl || media.posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/70 to-[#06080d]/40" />

        <div className="relative z-10 text-center max-w-md px-6">
          <span className="text-[#38bdf8] font-black text-2xl tracking-wider">DINUSTREAM</span>
          <h1 className="font-bold text-white text-lg sm:text-xl mt-2 tracking-tight">{media.title}</h1>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.25em] text-slate-400">
            {isDolby ? 'Starting Dolby Studio Master' : 'Preparing your stream'}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-slate-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>{isDolby ? 'Reading from NVMe cache…' : 'Checking the SSD cache…'}</span>
          </div>

          <div
            className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border text-[11px] font-mono ${
              isDolby ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-slate-400'
            }`}
          >
            {isDolby ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ◆ Dolby NVMe · Instant Playback
              </>
            ) : (
              <>
                <HardDriveDownload className="w-3 h-3 text-sky-400" />
                Drive → SSD
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CinemaPlayer
      media={media}
      episode={episode}
      seasons={seasons}
      nextEpisode={nextEpisode}
      prevEpisode={prevEpisode}
      onNextEpisode={handleNextEpisode}
      onPrevEpisode={handlePrevEpisode}
      onSelectEpisode={handleSelectEpisode}
      autoPlay
      fillViewport
      isGroupSync={isGroupSync}
      groupId={groupId}
    />
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080d] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
