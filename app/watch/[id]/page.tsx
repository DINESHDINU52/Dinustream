'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CinemaPlayer } from '@/components/player/CinemaPlayer';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { MediaItem, Episode, Season } from '@/types/cinema';
import { fetchRawItem, fetchEpisodes } from '@/lib/jellyfin/queries';
import { mapToMediaItem, mapToEpisode } from '@/lib/jellyfin/mappers';
import { Loader2, AlertTriangle } from 'lucide-react';

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
