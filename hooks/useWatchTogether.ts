'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WatchGroup,
  QueuedMovie,
  QuickReactionEmoji,
  FloatingReactionEvent,
  WatchGroupParticipant,
} from '@/types/watchTogether';
import { MediaItem, UserProfileId } from '@/types/cinema';
import { MOCK_WATCH_GROUP } from '@/lib/mock-data';
import { useSyncPlayLobby, SyncPlayLobbyEvent } from './useSyncPlayLobby';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export interface LobbyNotification {
  id: string;
  type: SyncPlayLobbyEvent['type'];
  message: string;
  timestamp: number;
}

function mapServerState(state: string): WatchGroup['state'] {
  switch (state) {
    case 'Playing':
      return 'PLAYING';
    case 'Paused':
      return 'PAUSED';
    case 'Waiting':
      return 'WAITING';
    case 'Idle':
    default:
      return 'CREATED';
  }
}

function makeParticipant(name: string, isHost: boolean): WatchGroupParticipant {
  return {
    id: name,
    name,
    avatarUrl: '/avatars/characters/grogu.svg',
    isHost,
    isOnline: true,
    isReady: true,
    statusText: 'In screening room',
  };
}

function uniqueParticipants(names: string[]): WatchGroupParticipant[] {
  const seen = new Set<string>();
  const out: WatchGroupParticipant[] = [];
  for (const name of names) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(makeParticipant(name, out.length === 0));
  }
  return out;
}

const IDLE_SYNC_PROGRESS: WatchGroup['syncProgress'] = {
  state: 'ready',
  percent: 100,
  speed: '—',
  eta: '0s',
  currentStep: 'Ready',
};

export function useWatchTogether(groupId: string = 'cinema-suite-alpha') {
  const [notifications, setNotifications] = useState<LobbyNotification[]>([]);

  const onLobbyEvent = useCallback((event: SyncPlayLobbyEvent) => {
    setNotifications((prev) =>
      [...prev, { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...event, timestamp: Date.now() }].slice(-5)
    );
  }, []);

  const lobby = useSyncPlayLobby(onLobbyEvent);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    // Auto-dismiss notifications after 5s.
    for (const n of notifications) {
      if (!timersRef.current[n.id]) {
        timersRef.current[n.id] = setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== n.id));
          delete timersRef.current[n.id];
        }, 5000);
      }
    }
    return () => {
      // cleanup handled per-dismissal
    };
  }, [notifications]);

  const dismissNotification = useCallback((id: string) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setNotifications((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const [group, setGroup] = useState<WatchGroup | null>(null);
  const [reactions, setReactions] = useState<FloatingReactionEvent[]>([]);

  // Mirror real SyncPlay server state into the local WatchGroup shape.
  useEffect(() => {
    if (DEMO) return;
    const { groupId: realId, groupInfo, serverState } = lobby;
    if (!realId) return;

    setGroup((prev) => {
      const serverParticipants = uniqueParticipants(groupInfo?.Participants ?? []);

      // Merge server members with the local mirror, keyed by id so there can
      // never be duplicate keys (the React list warning we kept hitting).
      const byId = new Map<string, WatchGroupParticipant>();
      for (const sp of serverParticipants) byId.set(sp.id, sp);
      for (const lp of prev?.participants ?? []) {
        const existing = byId.get(lp.id);
        if (existing) {
          byId.set(lp.id, {
            ...existing,
            avatarUrl: lp.avatarUrl,
            isHost: existing.isHost || lp.isHost,
            syncLatencyMs: lp.syncLatencyMs,
          });
        } else {
          byId.set(lp.id, lp);
        }
      }
      const mergedParticipants = Array.from(byId.values());

      if (!prev) {
        return {
          id: realId,
          name: groupInfo?.GroupName ?? 'Watch Party',
          state: mapServerState(serverState),
          hostId: mergedParticipants[0]?.id ?? '@@host',
          controlMode: 'EVERYONE',
          participants: mergedParticipants,
          selectedMovie: null,
          queue: [],
          syncProgress: IDLE_SYNC_PROGRESS,
          currentPositionSeconds: 0,
          isPlaying: serverState === 'Playing',
          createdAt: new Date().toISOString(),
          jellyfinSyncPlayGroupId: realId,
        };
      }
      return {
        ...prev,
        id: realId,
        name: groupInfo?.GroupName ?? prev.name,
        state: mapServerState(serverState),
        participants: mergedParticipants.length ? mergedParticipants : prev.participants,
        isPlaying: serverState === 'Playing',
        jellyfinSyncPlayGroupId: realId,
      };
    });
  }, [lobby.groupId, lobby.groupInfo, lobby.serverState]);

  const createGroup = useCallback(
    async (name: string, hostId: UserProfileId) => {
      if (DEMO) {
        setGroup({ ...MOCK_WATCH_GROUP, name, hostId });
        return;
      }
      try {
        const info = await lobby.createGroup(name);
        setGroup({
          id: info.GroupId,
          name: info.GroupName,
          state: mapServerState(info.State),
          hostId,
          controlMode: 'EVERYONE',
          participants: [makeParticipant(String(hostId), true)],
          selectedMovie: null,
          queue: [],
          syncProgress: IDLE_SYNC_PROGRESS,
          currentPositionSeconds: 0,
          isPlaying: info.State === 'Playing',
          createdAt: new Date().toISOString(),
          jellyfinSyncPlayGroupId: info.GroupId,
        });
      } catch (err) {
        console.warn('[useWatchTogether] SyncPlay create failed, staying local:', err);
      }
    },
    [lobby]
  );

  const joinGroup = useCallback(
    async (targetId: string, _userId: UserProfileId) => {
      if (DEMO) {
        setGroup({ ...MOCK_WATCH_GROUP, id: targetId });
        return;
      }
      try {
        await lobby.joinGroup(targetId);
        setGroup((prev) => (prev ? { ...prev, id: targetId, jellyfinSyncPlayGroupId: targetId } : prev));
      } catch (err) {
        console.warn('[useWatchTogether] SyncPlay join failed:', err);
      }
    },
    [lobby]
  );

  const leaveGroup = useCallback(async () => {
    setGroup(null);
    if (!DEMO) void lobby.leaveGroup();
  }, [lobby]);

  const selectMovie = useCallback(
    (movie: MediaItem) => {
      setGroup((prev) => (prev ? { ...prev, selectedMovie: movie } : prev));
      if (!DEMO) void lobby.queueItems([movie.id]);
    },
    [lobby]
  );

  const addToQueue = useCallback(
    (movie: any, addedById?: string) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const queuedItem: QueuedMovie = {
          id: 'q-' + Date.now(),
          movieId: movie.id,
          title: movie.title,
          runtime: movie.runtime || '',
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          badges: movie.badges || [],
          addedBy: (addedById as UserProfileId) || 'dinu',
          addedByName: movie.title,
          addedAt: Date.now(),
        };
        return { ...prev, queue: [...prev.queue, queuedItem] };
      });
      if (!DEMO) void lobby.queueItems([movie.id]);
    },
    [lobby]
  );

  const removeFromQueue = useCallback(
    (queueId: string) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const target = prev.queue.find((q) => q.id === queueId);
        const next = prev.queue.filter((q) => q.id !== queueId);
        if (!DEMO && target) {
          const playlistEntry = lobby.queue.find((e) => e.ItemId === target.movieId);
          if (playlistEntry) void lobby.removeFromPlaylist(playlistEntry.PlaylistItemId);
        }
        return { ...prev, queue: next };
      });
    },
    [lobby]
  );

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setGroup((prev) => {
      if (!prev) return prev;
      const nextQueue = [...prev.queue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);
      return { ...prev, queue: nextQueue };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setGroup((prev) => {
      if (!prev) return prev;
      if (!DEMO) {
        for (const q of prev.queue) {
          const playlistEntry = lobby.queue.find((e) => e.ItemId === q.movieId);
          if (playlistEntry) void lobby.removeFromPlaylist(playlistEntry.PlaylistItemId);
        }
      }
      return { ...prev, queue: [] };
    });
  }, [lobby]);

  const playNext = useCallback(
    (callback?: (movieId: string, grpId: string) => void) => {
      setGroup((prev) => {
        if (!prev || prev.queue.length === 0) return prev;
        const [next, ...rest] = prev.queue;
        if (callback) callback(next.movieId, prev.id);
        return {
          ...prev,
          queue: rest,
          selectedMovie: prev.selectedMovie ? { ...prev.selectedMovie, id: next.movieId, title: next.title } : prev.selectedMovie,
        };
      });
      if (!DEMO) void lobby.play();
    },
    [lobby]
  );

  const toggleParticipantReady = useCallback((userId: UserProfileId) => {
    setGroup((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === userId ? { ...p, isReady: !p.isReady } : p
        ),
      };
    });
  }, []);

  const startSyncAndPlay = useCallback(() => {
    setGroup((prev) => (prev ? { ...prev, isPlaying: true, state: 'PLAYING' as const } : null));
    if (!DEMO) void lobby.play();
  }, [lobby]);

  const resetGroup = useCallback(async () => {
    setGroup(null);
    if (!DEMO) void lobby.leaveGroup();
  }, [lobby]);

  const addParticipant = useCallback((participant: any) => {
    setGroup((prev) => {
      if (!prev) return null;
      if (prev.participants.some((p) => p.id === participant?.id)) return prev; // no dupes
      return { ...prev, participants: [...prev.participants, participant] };
    });
  }, []);

  const removeParticipant = useCallback((userId: UserProfileId) => {
    setGroup((prev) =>
      prev
        ? { ...prev, participants: prev.participants.filter((p) => p.id !== userId) }
        : null
    );
  }, []);

  const updateGroupName = useCallback((name: string) => {
    setGroup((prev) => (prev ? { ...prev, name } : null));
  }, []);

  const togglePlayback = useCallback(() => {
    setGroup((prev) => {
      if (!prev) return prev;
      return { ...prev, isPlaying: !prev.isPlaying, state: (!prev.isPlaying ? 'PLAYING' : 'PAUSED') as WatchGroup['state'] };
    });
    if (!DEMO) {
      const nextPlaying = !group?.isPlaying;
      if (nextPlaying) void lobby.play();
      else void lobby.pause();
    }
  }, [lobby, group?.isPlaying]);

  const sendReaction = useCallback((emoji: QuickReactionEmoji) => {
    const reaction: FloatingReactionEvent = {
      id: 'reaction-' + Date.now() + '-' + Math.random(),
      emoji,
      senderId: 'dinu',
      senderName: 'Dinu',
      timestamp: Date.now(),
      xOffsetPercent: Math.random() * 80 + 10,
    };
    setReactions((prev) => [...prev.slice(-15), reaction]);
  }, []);

  return {
    group,
    createGroup,
    joinGroup,
    leaveGroup,
    selectMovie,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playNext,
    toggleParticipantReady,
    startSyncAndPlay,
    resetGroup,
    addParticipant,
    removeParticipant,
    updateGroupName,
    togglePlayback,
    sendReaction,
    floatingReactions: reactions,
    notifications,
    dismissNotification,
    isHost: true,
    isRealGroup: !DEMO && Boolean(lobby.groupId),
  };
}