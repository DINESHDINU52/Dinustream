'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CinemaPlayer } from '@/components/player/CinemaPlayer';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { MediaItem, Episode, Season } from '@/types/cinema';
import { fetchRawItem, fetchEpisodes, fetchItemFilename } from '@/lib/jellyfin/queries';
import { mapToMediaItem, mapToEpisode } from '@/lib/jellyfin/mappers';
import { startSync } from '@/lib/api/syncManager';
import { Loader2, AlertTriangle, HardDriveDownload } from 'lucide-react';

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

function WatchContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGroupSync = searchParams.get('sync') === 'true';
  const groupId = searchParams.get('group') || 'group-movie-night';

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [episode, setEpisode] = useState<Episode | undefined>();
  const [seasons, setSeasons] = useState<Season[] | undefined>();
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [nextEpisode, setNextEpisode] = useState<Episode | undefined>();
  const [prevEpisode, setPrevEpisode] = useState<Episode | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrelude, setShowPrelude] = useState(true);

  // Kick the Python cache manager in the background the instant we enter the
  // page, so repeat views read from NVMe instead of Google Drive.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === '1') return;
    let cancelled = false;
    fetchItemFilename(id)
      .then((filename) => {
        if (!cancelled && filename) void startSync(filename).catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fade out the "Preparing your stream" prelude a moment after data resolves,
  // so the ffmpeg cold-start feels like an intentional transition.
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setShowPrelude(false), 900);
    return () => clearTimeout(timer);
  }, [loading]);

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
        } else if (raw.Type === 'Episode') {
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

  // Cinematic "Preparing your stream" prelude — makes the ffmpeg/HLS warm-up
  // feel like an intentional transition instead of a hang. Starts the Python
  // cache copy in the background for faster repeat watches.
  if (showPrelude) {
    return (
      <div className="relative min-h-screen bg-[#06080d] flex flex-col items-center justify-center select-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.backdropUrl || media.posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/70 to-[#06080d]/40" />

        <div className="relative z-10 text-center max-w-md px-6">
          <span className="text-[#38bdf8] font-black text-2xl tracking-wider">DINUSTREAM</span>
          <h1 className="font-bold text-white text-lg sm:text-xl mt-2 tracking-tight">{media.title}</h1>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.25em] text-slate-400">
            Preparing your stream
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-slate-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>Warming the pipeline…</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-slate-400">
            <HardDriveDownload className="w-3 h-3 text-sky-400" />
            Caching to SSD in background
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
