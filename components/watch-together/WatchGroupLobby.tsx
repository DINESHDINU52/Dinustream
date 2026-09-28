'use client';

import { UserProfileId } from '@/types/cinema';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WatchGroup, FloatingReactionEvent, QuickReactionEmoji } from '@/types/watchTogether';
import { MediaItem } from '@/types/cinema';
import { GroupMovieSelector } from './GroupMovieSelector';
import { GroupQueue } from './GroupQueue';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { QuickReactionBar } from '@/components/player/QuickReactionBar';
import { FloatingReactionOverlay } from '@/components/player/FloatingReactionOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Lock,
  Copy,
  Check,
  Bell,
  X,
  Users,
  Film,
  LogOut,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  notifications?: { id: string; type: string; message: string; timestamp: number }[];
  onDismissNotification?: (id: string) => void;
}

const statusLabel: Record<WatchGroup['state'], { text: string; variant: 'sync' | 'midnight' | 'silver' | 'atmos' }> = {
  CREATED: { text: 'LOBBY', variant: 'silver' },
  WAITING: { text: 'WAITING FOR GUESTS', variant: 'midnight' },
  SYNCING: { text: 'CACHING TO SSD', variant: 'atmos' },
  READY: { text: 'READY TO SCREEN', variant: 'sync' },
  PLAYING: { text: 'LIVE', variant: 'sync' },
  PAUSED: { text: 'PAUSED', variant: 'midnight' },
  ENDED: { text: 'ENDED', variant: 'silver' },
};

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
  onResetGroup,
  onUpdateGroupName,
  notifications,
  onDismissNotification,
}: WatchGroupLobbyProps) {
  const router = useRouter();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [copied, setCopied] = useState<'id' | 'link' | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionEvent[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const selected = group.selectedMovie;
  const status = statusLabel[group.state];
  const isCurrentUserHost = group.hostId === currentUserId;
  const currentProfileName =
    group.participants.find((p) => p.id === currentUserId || p.name === currentUserId)?.name ?? String(currentUserId);

  // Live reactions & screening launch across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const channel = new BroadcastChannel(`dinustream_sync_${group.id}`);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === 'SCREENING_LAUNCH' && event.data?.movieId) {
          router.push(
            `/watch/${event.data.movieId}?room=${encodeURIComponent(group.id)}&group=${encodeURIComponent(group.id)}&sync=true`
          );
          return;
        }
        if (event.data?.type !== 'REACTION') return;
        const reaction: FloatingReactionEvent = {
          id: event.data.id || `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          emoji: event.data.emoji,
          senderId: event.data.senderId || 'guest',
          senderName: event.data.senderName || 'Guest',
          timestamp: Date.now(),
          xOffsetPercent: event.data.xOffsetPercent || 30,
        };
        setFloatingReactions((prev) => [...prev.slice(-9), reaction]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 2000);
      };
      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      /* BroadcastChannel unsupported */
    }
  }, [group.id, router]);

  // Auto-route participants when the room state turns PLAYING with a selected movie
  useEffect(() => {
    if ((group.state === 'PLAYING' || group.isPlaying) && group.selectedMovie?.id) {
      router.push(
        `/watch/${group.selectedMovie.id}?room=${encodeURIComponent(group.id)}&group=${encodeURIComponent(group.id)}&sync=true`
      );
    }
  }, [group.state, group.isPlaying, group.selectedMovie, group.id, router]);

  const handleBroadcastReaction = useCallback(
    (emoji: QuickReactionEmoji) => {
      const reaction: FloatingReactionEvent = {
        id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji,
        senderId: currentUserId,
        senderName: currentProfileName,
        timestamp: Date.now(),
        xOffsetPercent: 25 + Math.random() * 50,
      };
      setFloatingReactions((prev) => [...prev.slice(-9), reaction]);
      setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id)), 2000);
      try {
        channelRef.current?.postMessage({ type: 'REACTION', ...reaction });
      } catch {
        /* ignore */
      }
    },
    [currentUserId, currentProfileName]
  );

  const handleCopy = (kind: 'id' | 'link') => {
    if (typeof window === 'undefined') return;
    const value =
      kind === 'link'
        ? `${window.location.origin}/watch-together?room=${encodeURIComponent(group.id)}`
        : group.id;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLaunch = () => {
    if (!selected) {
      setIsSelectorOpen(true);
      return;
    }
    setIsLaunching(true);
    onStartSyncAndPlay((movieId, groupId) => {
      router.push(
        `/watch/${movieId}?room=${encodeURIComponent(groupId)}&group=${encodeURIComponent(groupId)}&sync=true`
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      {/* Live room notifications */}
      <AnimatePresence>
        {notifications && notifications.length > 0 && (
          <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-50 flex flex-col gap-2 w-full max-w-xs pointer-events-none">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-start gap-2 p-3 rounded-xl bg-[#0b1220]/95 border border-sky-500/30 text-slate-200 text-xs shadow-xl backdrop-blur-xl"
              >
                <Bell className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{n.message}</span>
                <button
                  onClick={() => onDismissNotification?.(n.id)}
                  className="ml-auto shrink-0 text-slate-500 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Floating reactions */}
      <FloatingReactionOverlay reactions={floatingReactions} />

      {/* ── Header: name + status + invite + leave ─────────────────────── */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">🍿</span>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{group.name}</h1>
          <Badge variant={status.variant} size="sm">
            {status.text}
          </Badge>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => handleCopy('link')}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
            title="Copy invite link"
          >
            {copied === 'link' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Invite Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Invite</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleCopy('id')}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
            title="Copy room code"
          >
            {copied === 'id' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="max-w-[90px] truncate">{group.id.slice(0, 8)}</span>
          </button>
          <button
            onClick={() => void onResetGroup()}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 transition-all"
            title="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave
          </button>
        </div>
      </header>

      {/* ── Who's watching: compact avatar chips ───────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {group.participants.length}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {group.participants.map((p) => (
            <button
              key={p.id}
              onClick={() => onToggleReady(p.id)}
              className={cn(
                'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all',
                p.isReady
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              )}
              title={p.isReady ? `${p.name} is ready` : `${p.name} not ready`}
            >
              <div className="relative">
                <Avatar avatarUrl={p.avatarUrl} name={p.name} size="sm" isOnline={p.isOnline} />
                {p.isHost && (
                  <span className="absolute -top-1 -right-1 text-amber-400">
                    <Crown className="w-3 h-3 fill-amber-400" />
                  </span>
                )}
              </div>
              <span className={cn('text-xs font-medium', p.isReady ? 'text-emerald-300' : 'text-slate-300')}>
                {p.name}
                {p.id === currentUserId && <span className="text-slate-500"> (you)</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main: selected movie → one Start Watch Party ───────────────── */}
      <motion.div
        layout
        className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0f1c]/90 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        {selected ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.backdropUrl || selected.posterUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/70 to-[#0a0f1c]/30" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 sm:p-7">
              <div className="w-24 sm:w-32 aspect-[2/3] rounded-lg overflow-hidden border border-white/20 shadow-xl flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.posterUrl || selected.backdropUrl} alt={selected.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400">Now Screening</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">{selected.title}</h2>
                {selected.releaseYear > 0 && (
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {selected.releaseYear} · {selected.runtime || '—'}
                    {selected.badges.length > 0 && ` · ${selected.badges.join(' · ')}`}
                  </p>
                )}
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto justify-center shrink-0"
                icon={<Zap className="w-5 h-5 text-sky-300 fill-sky-300" />}
                onClick={handleLaunch}
                disabled={isLaunching}
                id="watch-together-sync-play-btn"
              >
                {isLaunching ? 'Starting…' : '⚡ Start Watch Party'}
              </Button>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-10 sm:p-14 text-center">
            <span className="text-4xl">🍿</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Pick a movie to screen</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Choose from your library — everyone in the room will watch it in sync.
              </p>
            </div>
            <Button
              variant="silver"
              size="lg"
              icon={<Film className="w-4 h-4" />}
              onClick={() => setIsSelectorOpen(true)}
            >
              Choose Movie
            </Button>
          </div>
        )}

        {/* Reaction bar floats over the panel */}
        <div className="absolute bottom-3 right-3 z-20">
          <QuickReactionBar onReact={handleBroadcastReaction} />
        </div>
      </motion.div>

      {/* ── Queue ──────────────────────────────────────────────────────── */}
      <GroupQueue
        queue={group.queue}
        isHost={isCurrentUserHost}
        currentUserId={currentUserId}
        onRemoveFromQueue={onRemoveFromQueue}
        onReorderQueue={onReorderQueue}
        onPlayNext={() => {
          onPlayNext?.((movieId, groupId) => {
            router.push(`/watch/${movieId}?room=${encodeURIComponent(groupId)}&group=${encodeURIComponent(groupId)}&sync=true`);
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
            releaseYear: new Date(item.addedAt).getFullYear(),
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

      {/* Movie picker */}
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