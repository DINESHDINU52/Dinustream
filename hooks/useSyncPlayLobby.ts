'use client';

// Real watch-together engine backed by Jellyfin SyncPlay (server-side clock).
// Listens to the shared WebSocket for group updates and exposes the REST
// commands. In demo mode it stays inert — useWatchTogether falls back to local
// mock state.

import { useEffect, useState, useCallback, useRef } from 'react';
import { syncPlay, SyncPlayGroupInfo, SyncPlayState } from '@/lib/jellyfin/syncPlay';
import { subscribeSyncPlay, SyncPlayGroupUpdateData } from '@/lib/jellyfin/syncPlaySocket';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
const TICKS_PER_SECOND = 10_000_000;

export interface SyncPlayQueueEntry {
  ItemId: string;
  PlaylistItemId: string;
}

export type SyncPlayLobbyEventType =
  | 'host_created'
  | 'group_joined'
  | 'group_left'
  | 'user_joined'
  | 'user_left'
  | 'state_changed';

export interface SyncPlayLobbyEvent {
  type: SyncPlayLobbyEventType;
  message: string;
}

/** Called on every realtime event so the UI can surface toasts/notifications. */
export type SyncPlayLobbyListener = (event: SyncPlayLobbyEvent) => void;

export function useSyncPlayLobby(onEvent?: SyncPlayLobbyListener) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<SyncPlayGroupInfo | null>(null);
  const [serverState, setServerState] = useState<SyncPlayState>('Idle');
  const [queue, setQueue] = useState<SyncPlayQueueEntry[]>([]);

  const groupIdRef = useRef<string | null>(null);
  const onEventRef = useRef<SyncPlayLobbyListener | undefined>(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: SyncPlayLobbyEvent) => {
    onEventRef.current?.(event);
  }, []);

  const refresh = useCallback(async (gid?: string) => {
    const id = gid ?? groupIdRef.current;
    if (!id) {
      setGroupInfo(null);
      setQueue([]);
      return;
    }
    try {
      const info = await syncPlay.getGroup(id);
      if (groupIdRef.current !== id) return; // stale
      setGroupInfo(info);
      setServerState(info.State);
    } catch {
      /* group may have been deleted */
    }
  }, []);

  useEffect(() => {
    if (DEMO) return;

    const unsubscribe = subscribeSyncPlay((message) => {
      if (message.MessageType !== 'SyncPlayGroupUpdate') return;
      const data = message.Data as SyncPlayGroupUpdateData;
      if (!data?.GroupId) return;
      if (groupIdRef.current && data.GroupId !== groupIdRef.current) return;

      switch (data.Type) {
        case 'GroupJoined': {
          groupIdRef.current = data.GroupId;
          setGroupId(data.GroupId);
          emit({ type: 'group_joined', message: 'You joined the screening room.' });
          void refresh(data.GroupId);
          break;
        }
        case 'UserJoined': {
          const name = String(data.Data ?? 'A guest');
          emit({ type: 'user_joined', message: `${name} joined the room.` });
          void refresh();
          break;
        }
        case 'UserLeft': {
          const name = String(data.Data ?? 'A guest');
          emit({ type: 'user_left', message: `${name} left the room.` });
          void refresh();
          break;
        }
        case 'GroupLeft': {
          emit({ type: 'group_left', message: 'You left the screening room.' });
          groupIdRef.current = null;
          setGroupId(null);
          setGroupInfo(null);
          setQueue([]);
          break;
        }
        case 'StateUpdate': {
          const payload = (data.Data ?? {}) as { State?: SyncPlayState };
          if (payload.State) {
            setServerState(payload.State);
            setGroupInfo((prev) => (prev ? { ...prev, State: payload.State! } : prev));
            const label =
              payload.State === 'Playing'
                ? 'playback started'
                : payload.State === 'Paused'
                  ? 'playback paused'
                  : `state → ${payload.State}`;
            emit({ type: 'state_changed', message: `Host ${label}.` });
          }
          break;
        }
        case 'PlayQueue': {
          const payload = (data.Data ?? {}) as { Playlist?: SyncPlayQueueEntry[]; IsPlaying?: boolean };
          setQueue(payload.Playlist ?? []);
          if (typeof payload.IsPlaying === 'boolean') {
            setServerState(payload.IsPlaying ? 'Playing' : 'Paused');
          }
          break;
        }
        case 'NotInGroup': {
          groupIdRef.current = null;
          setGroupId(null);
          setGroupInfo(null);
          setQueue([]);
          break;
        }
        default:
          break;
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createGroup = useCallback(
    async (name: string): Promise<SyncPlayGroupInfo> => {
      const info = await syncPlay.createGroup(name);
      groupIdRef.current = info.GroupId;
      setGroupId(info.GroupId);
      setGroupInfo(info);
      setServerState(info.State);
      emit({ type: 'host_created', message: `You created "${info.GroupName}". Share the invite link to bring others in.` });
      void syncPlay.setIgnoreWait(true).catch(() => {});
      return info;
    },
    [emit]
  );

  const joinGroup = useCallback(
    async (gid: string) => {
      await syncPlay.joinGroup(gid);
      groupIdRef.current = gid;
      setGroupId(gid);
      void syncPlay.setIgnoreWait(true).catch(() => {});
      void refresh(gid);
    },
    [refresh]
  );

  const leaveGroup = useCallback(async () => {
    await syncPlay.leaveGroup().catch(() => {});
    groupIdRef.current = null;
    setGroupId(null);
    setGroupInfo(null);
    setQueue([]);
    setServerState('Idle');
  }, []);

  const play = useCallback(async () => {
    setServerState('Playing');
    await syncPlay.play().catch(() => {});
  }, []);

  const pause = useCallback(async () => {
    setServerState('Paused');
    await syncPlay.pause().catch(() => {});
  }, []);

  const seek = useCallback(async (seconds: number) => {
    await syncPlay.seek(Math.round(seconds * TICKS_PER_SECOND)).catch(() => {});
  }, []);

  const queueItems = useCallback(async (itemIds: string[]) => {
    await syncPlay.queue(itemIds, 'Queue').catch(() => {});
  }, []);

  const removeFromPlaylist = useCallback(async (playlistItemId: string) => {
    await syncPlay.removeFromPlaylist([playlistItemId]).catch(() => {});
  }, []);

  const nextItem = useCallback(
    async (playlistItemId?: string) => {
      const current = queue.find((q) => playlistItemId ?? q.PlaylistItemId);
      const target = current?.PlaylistItemId;
      if (target) await syncPlay.nextItem(target).catch(() => {});
    },
    [queue]
  );

  const ping = useCallback(async () => {
    await syncPlay.ping(Math.round(Math.random() * 60 + 50)).catch(() => {});
  }, []);

  return {
    groupId,
    groupInfo,
    serverState,
    queue,
    createGroup,
    joinGroup,
    leaveGroup,
    play,
    pause,
    seek,
    queueItems,
    removeFromPlaylist,
    nextItem,
    refresh,
    ping,
  };
}