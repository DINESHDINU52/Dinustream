'use client';

import React, { useMemo, Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CinemaPlayer } from '@/components/player/CinemaPlayer';
import { Badge } from '@/components/ui/Badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CacheStatus } from '@/components/sync/CacheStatus';
import { getSyncStatus, SyncState } from '@/lib/api/syncManager';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { Episode, MediaItem, Season } from '@/types/cinema';
import { GroupChat } from '@/components/chat/GroupChat';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles, HardDrive, ShieldCheck } from 'lucide-react';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, companionProfile } = useActiveProfile();
  const [cacheState, setCacheState] = useState<SyncState>('not_cached');
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const episodeId = searchParams.get('episode');
  const isSyncMode = searchParams.get('sync') === 'true';
  const groupId = searchParams.get('group');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      mediaService.getMediaById(id),
      mediaService.getSeasonsForSeries(id),
    ])
      .then(([m, s]) => {
        if (!m) {
          setError('Media not found in private vault');
          setLoading(false);
          return;
        }
        setMedia(m);
        setSeasons(s || []);
      })
      .catch((err) => {
        console.error('[WatchPage] Error loading item:', err);
        setError('Failed to load playback session');
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  useEffect(() => {
    if (!media) return;
    const filename = currentEpisode ? `${currentEpisode.id}.mkv` : `${media.id}.mkv`;
    getSyncStatus(filename)
      .then((res) => setCacheState(res.state))
      .catch(() => setCacheState('not_cached'));
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
      <div className="min-h-screen bg-black flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
          Initializing Cinema Session...
        </p>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen bg-[#05070c] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="Stream Unavailable"
            message={error || 'Could not find this title in the library.'}
            onRetry={() => router.push('/')}
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
    <div className="relative min-h-screen bg-[#05080f] text-white flex flex-col justify-between selection:bg-rose-500/30">
      {/* Top Floating Cinema Navigation */}
      <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a0f18]/80 hover:bg-[#141f32] border border-slate-400/[0.12] text-xs font-medium text-slate-300 hover:text-white transition-all backdrop-blur-md cinema-focus"
          aria-label="Back to Cinema Hall"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Screen</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Synchronized playback presence badge */}
          {isSyncMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Sparkles className="w-3 h-3 text-rose-400 animate-pulse" />
              <span>Syncing with {companionProfile.name}</span>
            </div>
          )}

          {/* Local Sync Manager Cache Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <CacheStatus state={cacheState} />
          </div>
        </div>
      </header>

      {/* Main Cinema Player Container */}
      <main className="flex-1 flex flex-col justify-center">
        <CinemaPlayer
          media={media}
          episode={currentEpisode}
          nextEpisode={nextEpisode}
          prevEpisode={prevEpisode}
          onNextEpisode={handleNext}
          onPrevEpisode={handlePrev}
          autoPlay={true}
          seasons={seasons}
          onSelectEpisode={handleSelectEpisode}
          isGroupSync={isSyncMode}
          groupId={groupId || 'group-movie-night'}
          groupName="Movie Night ❤️"
        />
      </main>

      {/* Watch Together Live Chat System */}
      {isSyncMode && (
        <GroupChat
          groupId={groupId || 'group-movie-night'}
          groupName="Movie Night ❤️"
        />
      )}

      {/* Feature Context Tray */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {media.title}
              </h1>
              {currentEpisode && (
                <Badge variant="sync" size="sm">
                  S{currentEpisode.seasonNumber}:E{currentEpisode.episodeNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 font-light mt-1 max-w-2xl">
              {currentEpisode ? currentEpisode.overview || media.overview : media.overview}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {media.badges.map((b) => (
              <Badge key={b} variant={b === 'Dolby Atmos' ? 'atmos' : 'midnight'} size="sm">
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
    <Suspense fallback={<div className="min-h-screen bg-[#05080f]" />}>
      <WatchContent />
    </Suspense>
  );
}
