'use client';

import { UserProfileId } from '@/types/cinema';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WatchGroup, FloatingReactionEvent, QuickReactionEmoji } from '@/types/watchTogether';
import { MediaItem } from '@/types/cinema';
import { ParticipantList } from './ParticipantList';
import { GroupQueue } from './GroupQueue';
import { GroupMovieSelector } from './GroupMovieSelector';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuickReactionBar } from '@/components/player/QuickReactionBar';
import { FloatingReactionOverlay } from '@/components/player/FloatingReactionOverlay';
import { GroupChat } from '@/components/chat/GroupChat';
import { Avatar } from '@/components/ui/Avatar';
import {
  Zap,
  Film,
  HardDrive,
  Lock,
  RotateCcw,
  Users,
  Plus,
  Edit2,
  Copy,
  Check,
  Heart,
  Sparkles,
  X,
  SmilePlus,
} from 'lucide-react';
import Image from 'next/image';
import { profileService } from '@/lib/services/profileService';
import { motion, AnimatePresence } from 'framer-motion';

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
  onAddParticipant?: (participantId: UserProfileId) => void;
  onRemoveParticipant?: (participantId: UserProfileId) => void;
  onUpdateGroupName?: (name: string) => void;
  onCreateGroup?: (name: string, hostId: UserProfileId) => Promise<WatchGroup | void>;
}

const PRESET_ROOM_NAMES = [
  'Movie Night ❤️',
  'Marvel Marathon 🍿',
  'Anime Screening 🌸',
  'Sci-Fi Odyssey 🚀',
  'Family Cinema 🎬',
  'Late Night Binge 🌙',
];

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
  onAddParticipant,
  onRemoveParticipant,
  onUpdateGroupName,
  onCreateGroup,
}: WatchGroupLobbyProps) {
  const router = useRouter();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Movie Night ❤️');
  const [newRoomHost, setNewRoomHost] = useState<UserProfileId>(currentUserId);
  const [renameInput, setRenameInput] = useState(group.name);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Reaction state for the lobby
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionEvent[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const allProfiles = profileService.getAllProfiles();
  const currentProfile = allProfiles.find((p) => p.id === currentUserId);
  const isCurrentUserHost = group.hostId === currentUserId;
  const selected = group.selectedMovie;
  const sync = group.syncProgress;

  // Setup broadcast channel for room reactions in the lobby
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const channel = new BroadcastChannel(`dinustream_sync_${group.id}`);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'REACTION' && event.data?.emoji) {
          const reaction: FloatingReactionEvent = {
            id: event.data.id || `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            emoji: event.data.emoji,
            senderId: event.data.senderId || 'guest',
            senderName: event.data.senderName || 'Cinema Guest',
            timestamp: Date.now(),
            xOffsetPercent: event.data.xOffsetPercent || 20 + Math.random() * 60,
          };
          setFloatingReactions((prev) => [...prev, reaction]);
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 2000);
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {}
  }, [group.id]);

  const handleBroadcastReaction = useCallback(
    (emoji: QuickReactionEmoji) => {
      const reaction: FloatingReactionEvent = {
        id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji,
        senderId: currentUserId,
        senderName: currentProfile?.name || String(currentUserId),
        timestamp: Date.now(),
        xOffsetPercent: 25 + Math.random() * 50,
      };

      // Add locally
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2000);

      // Broadcast across tabs
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: 'REACTION',
            ...reaction,
          });
        } catch {}
      }

      // Forward to sync server
      fetch('/api/sync/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REACTION',
          groupId: group.id,
          sender: currentUserId,
          reactionEmoji: emoji,
          clientTimestamp: Date.now(),
        }),
      }).catch(() => {});
    },
    [currentUserId, currentProfile?.name, group.id]
  );

  const handleLaunch = () => {
    if (!selected) {
      setIsSelectorOpen(true);
      return;
    }
    setIsLaunching(true);
    onStartSyncAndPlay((movieId, groupId) => {
      router.push(
        `/watch/${movieId}?room=${encodeURIComponent(groupId)}&group=${encodeURIComponent(
          groupId
        )}&sync=true`
      );
    });
  };

  const handleCopyRoomId = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(group.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateNewGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateGroup) {
      await onCreateGroup(newRoomName.trim() || 'Movie Night ❤️', newRoomHost);
    }
    setIsNewGroupModalOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGroupName && renameInput.trim()) {
      onUpdateGroupName(renameInput.trim());
    }
    setIsRenameModalOpen(false);
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      {/* Floating Reaction Overlay for the Lobby */}
      <FloatingReactionOverlay reactions={floatingReactions} />

      {/* Top Header & Screening Suite Controls */}
      <GlassPanel
        variant="elevated"
        padding="lg"
        className="border-slate-400/[0.15] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/20 text-sky-400 text-xs font-mono">
                <Lock className="w-3 h-3" />
                Private Screening Group
              </span>
              {getStatusBadge()}

              {/* Room Code Badge */}
              <button
                type="button"
                onClick={handleCopyRoomId}
                title="Click to copy Room ID"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-all"
              >
                <span>ID: {group.id}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{group.name}</span>
              </h1>
              <button
                type="button"
                onClick={() => {
                  setRenameInput(group.name);
                  setIsRenameModalOpen(true);
                }}
                title="Rename Screening Room"
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all text-xs flex items-center gap-1 font-mono"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-400">
              Ultra-low latency frame synchronization powered by Jellyfin SyncPlay.
            </p>
          </div>

          {/* Header Action Suite: New Group & Perspective Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4 text-white" />}
              onClick={() => setIsNewGroupModalOpen(true)}
              className="shadow-[0_0_20px_rgba(14,165,233,0.3)] bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-semibold"
            >
              New Group
            </Button>

            {/* Quick Perspective Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#090e17] p-1.5 rounded-xl border border-white/[0.08]">
              <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Viewing as:
              </span>
              {allProfiles.map((p) => {
                const isCurrent = currentUserId === p.id;
                const isHost = group.hostId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSwitchProfile(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
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
        </div>

        {/* Live Lobby Reactions Dock */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <SmilePlus className="w-3.5 h-3.5 text-sky-400" />
              Live Reactions:
            </span>
            <QuickReactionBar onReact={handleBroadcastReaction} />
          </div>

          <p className="text-[11px] font-mono text-slate-500">
            Reactions appear live on all connected devices in the cinema suite.
          </p>
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
                disabled={isLaunching}
                id="watch-together-sync-play-btn"
              >
                {group.state === 'SYNCING'
                  ? 'SYNCING MEDIA TO SSD...'
                  : sync.state === 'ready'
                  ? '⚡ SYNC & PLAY NOW'
                  : '⚡ SYNC & PLAY (CACHE TO SSD)'}
              </Button>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-mono">
                Initiates synchronized 4K HDR playback for all room participants.
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
              isHost={isCurrentUserHost}
              roomId={group.id}
              onToggleReady={onToggleReady}
              onAddParticipant={onAddParticipant}
              onRemoveParticipant={onRemoveParticipant}
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
                    router.push(
                      `/watch/${movieId}?room=${encodeURIComponent(groupId)}&group=${encodeURIComponent(
                        groupId
                      )}&sync=true`
                    );
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

      {/* Embedded Group Chat */}
      <GroupChat groupId={group.id} groupName={group.name} />

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

      {/* Create New Group Modal */}
      <AnimatePresence>
        {isNewGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a0f1d] border border-white/[0.15] rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Create Screening Group</h3>
                </div>
                <button
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Room Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. Marvel Marathon 🍿"
                      className="w-full px-4 py-2.5 rounded-lg bg-[#0d1421] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <Heart className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  </div>

                  {/* Preset Suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {PRESET_ROOM_NAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setNewRoomName(name)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 text-slate-300 transition-all font-medium"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Designated Host
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {allProfiles.map((p) => {
                      const isSelected = newRoomHost === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setNewRoomHost(p.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                            isSelected
                              ? 'bg-rose-500/20 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                              : 'bg-[#0e1626] border-white/[0.08] hover:border-white/[0.15]'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 shrink-0">
                            <Avatar profile={p} size="sm" />
                          </div>
                          <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNewGroupModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={<Sparkles className="w-4 h-4 text-sky-300" />}
                  >
                    Launch New Room
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Group Modal */}
      <AnimatePresence>
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0a0f1d] border border-white/[0.15] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white">Rename Screening Room</h3>
                <button
                  onClick={() => setIsRenameModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="e.g. Cinema Night ❤️"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d1421] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRenameModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
