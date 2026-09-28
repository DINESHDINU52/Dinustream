// Jellyfin SyncPlay REST client (the server-side "watch together" engine).
// Every endpoint is under /SyncPlay/* and requires an authenticated session
// (the same-origin proxy / nginx inject the MediaBrowser auth header).

import { jfFetch } from './client';

export type SyncPlayState = 'Idle' | 'Waiting' | 'Paused' | 'Playing';
export type SyncPlayCommand = 'Unpause' | 'Pause' | 'Stop' | 'Seek';
export type SyncPlayQueueMode = 'Queue' | 'QueueNext';

export interface SyncPlayGroupInfo {
  GroupId: string;
  GroupName: string;
  State: SyncPlayState;
  /** Usernames of the participants. */
  Participants: string[];
  LastUpdatedAt: string;
}

const BASE = '/SyncPlay';

function post(path: string, body?: unknown): Promise<void> {
  return jfFetch<void>(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const syncPlay = {
  /** Create a group (becomes its host). */
  createGroup(groupName: string): Promise<SyncPlayGroupInfo> {
    return jfFetch<SyncPlayGroupInfo>(`${BASE}/New`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ GroupName: groupName }),
    });
  },

  joinGroup(groupId: string): Promise<void> {
    return post('Join', { GroupId: groupId });
  },

  leaveGroup(): Promise<void> {
    return post('Leave');
  },

  listGroups(): Promise<SyncPlayGroupInfo[]> {
    return jfFetch<SyncPlayGroupInfo[]>(`${BASE}/List`);
  },

  getGroup(groupId: string): Promise<SyncPlayGroupInfo> {
    return jfFetch<SyncPlayGroupInfo>(`${BASE}/${groupId}`);
  },

  // --- playback control (broadcast to every member) ---
  play(): Promise<void> {
    return post('Unpause');
  },

  pause(): Promise<void> {
    return post('Pause');
  },

  stop(): Promise<void> {
    return post('Stop');
  },

  seek(positionTicks: number): Promise<void> {
    return post('Seek', { PositionTicks: Math.round(positionTicks) });
  },

  // --- queue management ---
  queue(itemIds: string[], mode: SyncPlayQueueMode = 'Queue'): Promise<void> {
    return post('Queue', { ItemIds: itemIds, Mode: mode });
  },

  setPlaylistItem(playlistItemId: string): Promise<void> {
    return post('SetPlaylistItem', { PlaylistItemId: playlistItemId });
  },

  removeFromPlaylist(itemIds: string[]): Promise<void> {
    return post('RemoveFromPlaylist', {
      PlaylistItemIds: itemIds,
      ClearPlaylist: false,
      ClearPlayingItem: false,
    });
  },

  // --- misc ---
  nextItem(playlistItemId: string): Promise<void> {
    return post('NextItem', { PlaylistItemId: playlistItemId });
  },

  previousItem(playlistItemId: string): Promise<void> {
    return post('PreviousItem', { PlaylistItemId: playlistItemId });
  },

  // --- group wait & readiness (prevents Jellyfin's 30s group wait deadline) ---
  setIgnoreWait(ignoreWait = true): Promise<void> {
    return post('SetIgnoreWait', { IgnoreWait: ignoreWait });
  },

  ready(positionTicks = 0, isPlaying = true, playlistItemId?: string): Promise<void> {
    return post('Ready', {
      When: new Date().toISOString(),
      PositionTicks: Math.round(positionTicks),
      IsPlaying: isPlaying,
      PlaylistItemId: playlistItemId || '00000000-0000-0000-0000-000000000000',
    });
  },

  buffering(isBuffering: boolean, positionTicks = 0, isPlaying = true): Promise<void> {
    return post('Buffering', {
      When: new Date().toISOString(),
      PositionTicks: Math.round(positionTicks),
      IsPlaying: isPlaying,
      PlaylistItemId: '00000000-0000-0000-0000-000000000000',
    });
  },

  ping(pingMs: number): Promise<void> {
    return post('Ping', { Ping: pingMs });
  },
};
