/**
 * Jellyfin SyncPlay API Client
 *
 * Facilitates synchronized multi-user playback sessions using Jellyfin's
 * native SyncPlay protocol while routing through DinuStream's secure server proxy.
 */

export interface JellyfinSyncPlayGroupDto {
  GroupId: string;
  PlayingItemId?: string;
  PositionTicks?: number;
  PlayState?: 'Playing' | 'Paused' | 'Idle';
  Participants?: Array<{
    UserId: string;
    UserName: string;
    PositionTicks?: number;
    PingMs?: number;
  }>;
}

const PROXY_BASE = process.env.NEXT_PUBLIC_JELLYFIN_PROXY_URL || '/api/jellyfin';

/**
 * 1 second = 10,000,000 ticks in Jellyfin / .NET time units.
 */
export const TICKS_PER_SECOND = 10000000;

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function ticksToSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

/**
 * Fetches all active SyncPlay groups on the Jellyfin server
 */
export async function listSyncPlayGroups(): Promise<JellyfinSyncPlayGroupDto[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/list`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[SyncPlay] Error listing Jellyfin groups:', err);
  }
  return [];
}

/**
 * Creates a new Jellyfin SyncPlay Group
 */
export async function createSyncPlayGroup(groupName: string): Promise<{ GroupId: string }> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ GroupName: groupName }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[SyncPlay] Error creating Jellyfin group, falling back to local ID:', err);
  }
  return { GroupId: `syncplay-${Date.now()}` };
}

/**
 * Join an existing Jellyfin SyncPlay group
 */
export async function joinSyncPlayGroup(groupId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ GroupId: groupId }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Send playback command to Jellyfin SyncPlay group (Play, Pause, Seek)
 */
export async function sendSyncPlayCommand(
  groupId: string,
  command: 'Play' | 'Pause' | 'Seek',
  positionSeconds?: number
): Promise<boolean> {
  try {
    const positionTicks = typeof positionSeconds === 'number' ? secondsToTicks(positionSeconds) : undefined;
    const action = command === 'Play' ? 'unpause' : command.toLowerCase();

    const res = await fetch(`${PROXY_BASE}/syncplay/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        GroupId: groupId,
        PositionTicks: positionTicks,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SyncPlay] Command forwarding error:', err);
    return true;
  }
}

/**
 * Report buffering status to Jellyfin SyncPlay
 */
export async function reportBuffering(
  groupId: string,
  itemId: string,
  positionSeconds: number
): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/buffering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        GroupId: groupId,
        ItemId: itemId,
        PositionTicks: secondsToTicks(positionSeconds),
        When: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Report ready to play status to Jellyfin SyncPlay
 */
export async function reportReady(
  groupId: string,
  itemId: string,
  positionSeconds: number
): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        GroupId: groupId,
        ItemId: itemId,
        PositionTicks: secondsToTicks(positionSeconds),
        When: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Send network ping latency telemetry to Jellyfin SyncPlay
 */
export async function pingSyncPlay(pingMs: number): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Ping: Math.round(pingMs) }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Leave a Jellyfin SyncPlay group
 */
export async function leaveSyncPlayGroup(groupId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/syncplay/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ GroupId: groupId }),
    });
    return res.ok;
  } catch {
    return true;
  }
}
