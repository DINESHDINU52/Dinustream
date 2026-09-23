'use client';

import { UserProfileId } from '@/types/cinema';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WatchGroup } from '@/types/watchTogether';
import { MediaItem } from '@/types/cinema';
import { ParticipantList } from './ParticipantList';
import { GroupQueue } from './GroupQueue';
import { GroupMovieSelector } from './GroupMovieSelector';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Zap,
  Film,
  HardDrive,
  Lock,
  RotateCcw,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { profileService } from '@/lib/services/profileService';

interface WatchGroupLobbyProps {
  group: WatchGroup;
  currentUserId: UserProfileId;
  onSelectMovie: (movie: MediaItem) => void;
  onAddToQueue: (movie: MediaItem) => void;
  onRemoveFromQueue: (movieId: string) => void;
  onReorderQueue?: (fromIndex: number, toIndex: number) => void;
  onClearQueue?: () => void;
  onPlayNext?: (onLaunch?: (movieId: string, groupId: string) => void) => void;
  onToggleReady: (participantId: UserProfileId) => void;
  onStartSyncAndPlay: (onLaunch: (movieId: string, groupId: string) => void) => void;
  onSwitchProfile: (profileId: UserProfileId) => void;
  onResetGroup: () => void;
}

export function WatchGroupLobby({
  group,
  currentUserId,
  onSelectMovie,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
  onPlayNext,
  onToggleReady,
  onStartSyncAndPlay,
  onSwitchProfile,
  onResetGroup,
}: WatchGroupLobbyProps) {
  const router = useRouter();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const isCurrentUserHost = group.hostId === currentUserId;
  const selected = group.selectedMovie;
  const sync = group.syncProgress;

  const handleLaunch = () => {
    setIsLaunching(true);
    onStartSyncAndPlay((movieId, groupId) => {
      router.push(`/watch/${movieId}?sync=true&group=${groupId}`);
    });
  };

  const getStatusBadge = () => {
    switch (group.state) {
      case 'CREATED':
        return <Badge variant="silver">LOBBY CREATED</Badge>;
      case 'WAITING':
        return <Badge variant="midnight">WAITING FOR GUESTS</Badge>;
      case 'SYNCING':
        return <Badge variant="atmos">CACHING TO SSD</Badge>;
      case 'READY':
        return <Badge variant="sync">READY TO SCREEN</Badge>;
      case 'PLAYING':
        return <Badge variant="sync">LIVE SYNCHRONIZED</Badge>;
      default:
        return <Badge variant="silver">{group.state}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Header & Presence Control */}
      <GlassPanel
        variant="elevated"
        padding="lg"
        className="border-slate-400/[0.15] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/20 text-sky-400 text-xs font-mono">
                <Lock className="w-3 h-3" />
                Private Screening Group
              </span>
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{group.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Ultra-low latency frame synchronization powered by Jellyfin SyncPlay.
            </p>
          </div>

          {/* Quick Perspective Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-[#090e17] p-1.5 rounded-xl border border-white/[0.08]">
            <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Viewing as:
            </span>
            {profileService.getAllProfiles().map((p) => {
              const isCurrent = currentUserId === p.id;
              const isHost = group.hostId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSwitchProfile(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.name} {isHost ? '(Host)' : ''}
                </button>
              );
            })}

            <button
              onClick={onResetGroup}
              title="Reset Group State"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] transition-all ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Main Grid: Selected Movie & Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Feature Presentation Card */}
        <div className="lg:col-span-7 space-y-6">
          <GlassPanel variant="standard" padding="lg" className="border-white/[0.1] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                Featured Presentation
              </h2>
              {isCurrentUserHost && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSelectorOpen(true)}
                >
                  Change Title
                </Button>
              )}
            </div>

            {selected ? (
              <div className="relative rounded-xl overflow-hidden border border-white/[0.1] bg-[#090e17] group">
                {/* Backdrop Image */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                  <Image
                    src={selected.backdropUrl}
                    alt={selected.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090e17] via-[#090e17]/60 to-transparent" />
                </div>

                {/* Details Overlay */}
                <div className="p-5 relative z-10 -mt-20 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.badges.map((badge) => (
                      <span
                        key={badge}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-white border border-white/10"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {selected.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-light">
                    {selected.releaseYear} • {selected.runtime} • {selected.rating} •{' '}
                    {selected.genres.join(', ')}
                  </p>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                    {selected.overview}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl border border-dashed border-white/10 space-y-3 bg-[#090e17]">
                <Film className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">No film selected yet</p>
                <Button variant="primary" size="sm" onClick={() => setIsSelectorOpen(true)}>
                  Select Feature Film
                </Button>
              </div>
            )}

            {/* Cache Pipeline Indicator */}
            {selected && (
              <div className="p-4 rounded-xl bg-[#070b13] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    <span className="font-medium text-white">Oracle SSD Cache Pipeline</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] ${
                      sync.state === 'ready' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {sync.state === 'ready' ? 'Cached on Fast NVMe' : `${sync.speed} • ETA: ${sync.eta}`}
                  </span>
                </div>

                {/* Stepper Pipeline */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div
                    className={`p-2 rounded-lg border text-center ${
                      sync.currentStep === 'Google Drive'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : sync.percent >= 50
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                    }`}
                  >
                    1. Google Drive
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      sync.currentStep === 'Oracle SSD'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 animate-pulse'
                        : sync.percent >= 99
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                    }`}
                  >
                    2. Oracle SSD
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      sync.state === 'ready'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                    }`}
                  >
                    3. Ready
                  </div>
                </div>

                <ProgressBar progress={sync.percent} size="md" variant="accent" />
              </div>
            )}

            {/* Launch Master Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center text-sm sm:text-base py-3.5 shadow-[0_4px_24px_rgba(14,165,233,0.3)]"
                icon={<Zap className="w-5 h-5 text-sky-300 fill-sky-300" />}
                onClick={handleLaunch}
                disabled={isLaunching || !selected}
                id="watch-together-sync-play-btn"
              >
                {group.state === 'SYNCING'
                  ? 'SYNCING MEDIA TO SSD...'
                  : sync.state === 'ready'
                  ? '⚡ SYNC & PLAY NOW'
                  : '⚡ SYNC & PLAY (CACHE TO SSD)'}
              </Button>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-mono">
                Initiates synchronized 4K HDR playback for all participants.
              </p>
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Participants & Screening Queue */}
        <div className="lg:col-span-5 space-y-6">
          <GlassPanel variant="standard" padding="lg" className="border-white/[0.1] space-y-6">
            <ParticipantList
              participants={group.participants}
              currentUserId={currentUserId}
              onToggleReady={onToggleReady}
            />

            <div className="border-t border-white/[0.08] pt-6">
              <GroupQueue
                queue={group.queue}
                isHost={isCurrentUserHost}
                currentUserId={currentUserId}
                onRemoveFromQueue={onRemoveFromQueue}
                onReorderQueue={onReorderQueue}
                onPlayNext={() => {
                  onPlayNext?.((movieId, groupId) => {
                    router.push(`/watch/${movieId}?sync=true&group=${groupId}`);
                  });
                }}
                onPlayQueueItem={(item) => {
                  onSelectMovie({
                    id: item.movieId,
                    title: item.title,
                    overview: 'Selected from screening queue.',
                    type: 'movie',
                    backdropUrl: item.backdropUrl || item.posterUrl,
                    posterUrl: item.posterUrl,
                    releaseYear: 2024,
                    rating: 'U/A',
                    runtime: item.runtime,
                    matchScore: 99,
                    genres: ['Drama'],
                    badges: item.badges as import('@/types/cinema').MediaBadge[],
                  });
                }}
                onClearQueue={onClearQueue}
                onOpenSelector={() => setIsSelectorOpen(true)}
              />
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Movie Selector Modal */}
      <GroupMovieSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectMovie={(movie) => {
          onSelectMovie(movie);
          onAddToQueue(movie);
          setIsSelectorOpen(false);
        }}
        currentMovieId={selected?.id}
      />
    </div>
  );
}
