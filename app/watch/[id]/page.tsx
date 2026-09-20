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
import { getMediaById, FEATURED_HERO_MEDIA } from '@/lib/mock-data';
import { getSeasonsForSeries } from '@/lib/mock-series';
import { mediaService } from '@/lib/services/mediaService';
import { Episode, MediaItem, Season } from '@/types/cinema';
import { GroupChat } from '@/components/chat/GroupChat';
import { ArrowLeft, Sparkles, HardDrive, ShieldCheck } from 'lucide-react';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, companionProfile } = useActiveProfile();
  const [cacheState, setCacheState] = useState<SyncState>('not_cached');
  const [liveMedia, setLiveMedia] = useState<MediaItem | null>(null);
  const [liveSeasons, setLiveSeasons] = useState<Season[] | null>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const episodeId = searchParams.get('episode');
  const isSyncMode = searchParams.get('sync') === 'true';
  const groupId = searchParams.get('group');

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
    if (!id) return FEATURED_HERO_MEDIA;
    return getMediaById(id) || FEATURED_HERO_MEDIA;
  }, [id]);

  const media = liveMedia || fallbackMedia;

  const fallbackSeasons = useMemo(() => {
    if (media.type === 'series' || id.includes('severance') || id.includes('succession')) {
      return getSeasonsForSeries(media.id);
    }
    return [];
  }, [media, id]);

  const seasons = liveSeasons || fallbackSeasons;

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
    const filename = currentEpisode ? `${currentEpisode.id}.mkv` : `${media.id}.mkv`;
    getSyncStatus(filename)
      .then((res) => setCacheState(res.state))
      .catch(() => setCacheState('not_cached'));
  }, [media.id, currentEpisode]);

  const currentIndex = currentEpisode
    ? allEpisodes.findIndex((e) => e.id === currentEpisode.id)
    : -1;

  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : undefined;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? allEpisodes[currentIndex + 1]
      : undefined;

  const handleNext = () => {
    if (nextEpisode) {
      router.push(`/watch/${media.id}?episode=${nextEpisode.id}`);
    }
  };

  const handlePrev = () => {
    if (prevEpisode) {
      router.push(`/watch/${media.id}?episode=${prevEpisode.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-100 selection:bg-slate-200 selection:text-black">
      {/* Player Frame (Full Widescreen Cinema Presentation) */}
      <div className="w-full bg-black shadow-2xl">
        <CinemaPlayer
          media={media}
          episode={currentEpisode}
          nextEpisode={nextEpisode}
          prevEpisode={prevEpisode}
          onNextEpisode={handleNext}
          onPrevEpisode={handlePrev}
          seasons={seasons}
          onSelectEpisode={(epId) => router.push(`/watch/${media.id}?episode=${epId}`)}
          isGroupSync={isSyncMode}
          groupId={groupId || 'group-movie-night'}
          groupName="Movie Night ❤️"
        />
      </div>

      {/* Media & Sync Presence Bar below the player */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded bg-[#0e1422] hover:bg-[#162136] text-slate-400 hover:text-white border border-white/10 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                {media.title}
              </h1>
              {currentEpisode && (
                <Badge variant="midnight" size="sm">
                  S{currentEpisode.seasonNumber}:E{currentEpisode.episodeNumber}
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-light pl-8">
              {currentEpisode
                ? currentEpisode.title
                : `${media.releaseYear} • ${media.runtime} • ${media.genres.join(', ')}`}
            </p>
          </div>

          {/* Sync Status Badge */}
          <div className="flex items-center gap-3">
            <GlassPanel variant="subtle" padding="sm" className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Avatar profile={profile} size="sm" />
                <span className="text-xs text-slate-300 font-medium">{profile.name}</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <Avatar profile={companionProfile} size="sm" />
                <span className="text-xs text-slate-300 font-medium">{companionProfile.name}</span>
              </div>
              <Badge variant="sync" size="sm" className="ml-1">
                Synchronized
              </Badge>
            </GlassPanel>

            {isSyncMode && (
              <button
                onClick={() => router.push(groupId ? `/watch-together?group=${groupId}` : '/watch-together')}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-xs font-medium transition-all"
              >
                Watch Group Lobby
              </button>
            )}
          </div>
        </div>

        {/* Technical Health Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassPanel variant="standard" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Storage Layer</span>
              </div>
              <CacheStatus state={cacheState} />
            </div>
            <p className="text-xs text-slate-300">Oracle NVMe SSD Cache</p>
            <p className="text-[11px] text-slate-400 font-light">
              Master copy mirrored to private Google Drive storage.
            </p>
          </GlassPanel>

          <GlassPanel variant="standard" padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Audio Calibration</span>
            </div>
            <p className="text-xs text-slate-300">Dolby Atmos Bitstream</p>
            <p className="text-[11px] text-slate-400 font-light">
              Discrete 7.1.4 object-based audio stream with zero compression.
            </p>
          </GlassPanel>

          <GlassPanel variant="standard" padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Private Cinema Security</span>
            </div>
            <p className="text-xs text-slate-300">Encrypted Point-to-Point</p>
            <p className="text-[11px] text-slate-400 font-light">
              Exclusively routed between Dinu and Kanmani.
            </p>
          </GlassPanel>
        </div>

        {/* Series Episodes Row (if viewing a series) */}
        {allEpisodes.length > 0 && (
          <section className="space-y-4 pt-4">
            <SectionHeader
              kicker="Available Chapters"
              title="Series Episodes"
              subtitle="Quickly jump between episodes in this series."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allEpisodes.slice(0, 8).map((ep) => {
                const isCurrent = currentEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => router.push(`/watch/${media.id}?episode=${ep.id}`)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#141d2e] border-sky-500/40 shadow-lg'
                        : 'bg-[#090e17] border-white/[0.06] hover:border-white/[0.18]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                      <span>S{ep.seasonNumber}:E{ep.episodeNumber}</span>
                      <span>{ep.runtime}</span>
                    </div>
                    <h3 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                      {ep.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 font-light">
                      {ep.overview}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Private Watch Together Chat Drawer */}
      <GroupChat
        groupId={groupId || 'group-movie-night'}
        groupName="Movie Night ❤️"
      />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050507]" />}>
      <WatchContent />
    </Suspense>
  );
}
