// High-level Jellyfin data queries returning DinuStream domain types.
// Every function assumes the caller is authenticated (cookie present); the
// server-side proxy injects the MediaBrowser auth header.

import { MediaItem, Season, Episode, ContinueWatchingItem } from '@/types/cinema';
import { MediaSegment, JellyfinMediaSegmentDto } from '@/types/segments';
import { SearchResultItem } from '@/types/search';
import { jfFetch, getUserId, TICKS_PER_SECOND } from './client';
import {
  JellyfinQueryResult,
  JellyfinBaseItem,
  JellyfinSearchHintResult,
  JellyfinPlaybackInfoResponse,
  JellyfinUser,
} from './types';
import { mapToMediaItem, mapToEpisode, mapToSeason, mapToContinueWatching, mapSearchHint } from './mappers';

const ITEM_FIELDS = 'MediaStreams,People,Genres,Studios,Overview,ProviderIds,MediaSources,Chapters';

function uid(): string {
  return getUserId();
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export async function fetchFeaturedItems(count = 7): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinBaseItem[]>(`/Items/Latest${qs({ Limit: count, Fields: ITEM_FIELDS })}`);
  return (data ?? []).map(mapToMediaItem);
}

export async function fetchMovies(count = 50): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Items${qs({
      IncludeItemTypes: 'Movie',
      Recursive: true,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      Fields: ITEM_FIELDS,
      Limit: count,
    })}`
  );
  return (data.Items ?? []).map(mapToMediaItem);
}

export async function fetchSeries(count = 20): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Items${qs({
      IncludeItemTypes: 'Series',
      Recursive: true,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      Fields: ITEM_FIELDS,
      Limit: count,
    })}`
  );
  return (data.Items ?? []).map(mapToMediaItem);
}

export async function fetchRecentlyAdded(count = 20): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinBaseItem[]>(`/Items/Latest${qs({ Limit: count, Fields: ITEM_FIELDS })}`);
  return (data ?? []).map(mapToMediaItem);
}

export async function fetchItem(id: string): Promise<MediaItem | null> {
  const item = await jfFetch<JellyfinBaseItem>(`/Items/${id}`);
  if (!item?.Id) return null;
  return mapToMediaItem(item);
}

/** Raw item (with Type) — lets callers branch Movie vs Series vs Episode. */
export async function fetchRawItem(id: string): Promise<JellyfinBaseItem | null> {
  const item = await jfFetch<JellyfinBaseItem>(`/Items/${id}`);
  return item?.Id ? item : null;
}

/**
 * The on-disk filename for an item, used as the key for the Python Sync Manager
 * (which copies files from Google Drive -> local NVMe by filename). Returns the
 * path relative to the matching Drive library root, e.g.
 * `Dune (2021)/Dune.2021.mkv`. Keeping the relative folders is important:
 * rclone cannot find a file that lives in a Drive subfolder when given only
 * its basename.
 */
export async function fetchItemFilename(id: string): Promise<string | null> {
  const item = await jfFetch<JellyfinBaseItem>(`/Items/${id}`).catch(() => null);
  if (!item?.Path) return null;
  const normalized = item.Path.replace(/\\/g, '/');
  const marker = normalized.match(/\/(Movies|Shows)\/(.+)$/i);
  if (marker?.[2]) return marker[2];
  const parts = normalized.split('/');
  return parts[parts.length - 1] || null;
}

export interface JellyfinAncestor {
  Id?: string;
  Name?: string;
  Type?: string;
}

/** Parent folders/collection the item lives in (e.g. the Dolby library). */
export async function fetchItemAncestors(id: string): Promise<JellyfinAncestor[]> {
  const data = await jfFetch<JellyfinAncestor[]>(`/Items/${id}/Ancestors`).catch(() => []);
  return data ?? [];
}

/**
 * Name of the Jellyfin library (folder) that holds the Dolby ad clips.
 *
 * The *folder* is the contract, never a single file: the ad reel is read live on
 * every play, so clips can be renamed, replaced, added or removed in the library
 * without touching code. Rename the library and override this without a rebuild:
 *   NEXT_PUBLIC_DOLBY_ADS_LIBRARY="Dolby Ads"
 */
export const DOLBY_ADS_LIBRARY = process.env.NEXT_PUBLIC_DOLBY_ADS_LIBRARY || 'Dolby';

/** Case-insensitive match against the configured ad folder name. */
function isDolbyLibrary(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === DOLBY_ADS_LIBRARY.trim().toLowerCase();
}

/**
 * True when an item belongs to the Dolby folder — i.e. its file lives in
 * /opt/dinustream/cache/dolby (permanently cached on NVMe). Dolby titles are
 * played instantly and never need the Google Drive sync manager.
 */
export async function isDolbyItem(id: string): Promise<boolean> {
  const ancestors = await fetchItemAncestors(id);
  return ancestors.some((a) => isDolbyLibrary(a.Name));
}

/**
 * Every playable clip currently in the Dolby ad folder.
 *
 * Read fresh (never cached) and in full, so a clip added or swapped in the
 * folder is picked up on the very next play. Empty array means the folder is
 * missing or has no playable items — callers then skip the ad entirely.
 */
export async function fetchDolbyAdIds(): Promise<string[]> {
  const userId = getUserId();
  if (!userId) return [];
  const views = await jfFetch<JellyfinBaseItem[]>(`/Users/${userId}/Views`).catch(() => []);
  const folder = views.find((v) => isDolbyLibrary(v.Name));
  if (!folder?.Id) return [];
  const items = await jfFetch<JellyfinQueryResult>(
    `/Users/${userId}/Items${qs({
      ParentId: folder.Id,
      Recursive: true,
      IncludeItemTypes: 'Movie,Episode,Video',
      Fields: 'Path',
      Limit: 500,
    })}`
  ).catch(() => null);
  return (items?.Items ?? [])
    .map((i) => i.Id)
    .filter((id): id is string => Boolean(id));
}

/**
 * One random clip from the Dolby ad folder, or null when the folder is empty.
 * Randomising per play keeps the first-run prelude from repeating.
 */
export async function fetchRandomDolbyAd(): Promise<{ itemId: string } | null> {
  const ids = await fetchDolbyAdIds();
  if (ids.length === 0) return null;
  return { itemId: ids[Math.floor(Math.random() * ids.length)] };
}

export async function fetchSeasons(seriesId: string): Promise<Season[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Shows/${seriesId}/Seasons${qs({ UserId: uid() || undefined, Fields: ITEM_FIELDS })}`
  );
  return (data.Items ?? []).map(mapToSeason);
}

export async function fetchEpisodes(seriesId: string, seasonId?: string): Promise<Episode[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Shows/${seriesId}/Episodes${qs({ SeasonId: seasonId || undefined, UserId: uid() || undefined, Fields: 'Overview,MediaStreams' })}`
  );
  return (data.Items ?? []).map(mapToEpisode);
}

export async function fetchContinueWatching(count = 20): Promise<ContinueWatchingItem[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/UserItems/Resume${qs({ Limit: count, Fields: ITEM_FIELDS, MediaTypes: 'Video' })}`
  );
  return (data.Items ?? []).map(mapToContinueWatching);
}

export async function fetchNextUp(count = 20): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Shows/NextUp${qs({ Limit: count, Fields: ITEM_FIELDS })}`
  );
  return (data.Items ?? []).map(mapToMediaItem);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchHints(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) return [];
  const data = await jfFetch<JellyfinSearchHintResult>(
    `/Search/Hints${qs({ SearchTerm: query, Limit: 30 })}`
  );
  return (data.SearchHints ?? []).map(mapSearchHint);
}

export async function fetchItemsBySearch(query: string, limit = 40): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const data = await jfFetch<JellyfinQueryResult>(
    `/Items${qs({
      SearchTerm: query,
      Recursive: true,
      IncludeItemTypes: 'Movie,Series,Episode',
      Fields: ITEM_FIELDS,
      Limit: limit,
    })}`
  );
  return (data.Items ?? []).map(mapToMediaItem);
}

// ---------------------------------------------------------------------------
// Users & favourites
// ---------------------------------------------------------------------------

/** Anonymous endpoint — drives the profile picker on /login. */
export async function fetchPublicUsers(): Promise<JellyfinUser[]> {
  const data = await jfFetch<JellyfinUser[]>('/Users/Public');
  return data ?? [];
}

export async function fetchCurrentUser(): Promise<JellyfinUser | null> {
  const user = await jfFetch<JellyfinUser>('/Users/Me');
  return user?.Id ? user : null;
}

export async function fetchFavorites(count = 200): Promise<MediaItem[]> {
  const data = await jfFetch<JellyfinQueryResult>(
    `/Items${qs({ IsFavorite: true, Recursive: true, Fields: ITEM_FIELDS, Limit: count })}`
  );
  return (data.Items ?? []).map(mapToMediaItem);
}

/** Add/remove a favourite (My List). Returns the new state. */
export async function setFavorite(itemId: string, isFavorite: boolean): Promise<boolean> {
  await jfFetch<void>(`/UserFavoriteItems/${itemId}`, {
    method: isFavorite ? 'POST' : 'DELETE',
  });
  return isFavorite;
}

/** Ask Jellyfin to rescan its libraries (the "Scan All Libraries" button). */
export async function refreshLibrary(): Promise<void> {
  await jfFetch<void>('/Library/Refresh', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Segments (intro/recap/outro skip)
// ---------------------------------------------------------------------------

export async function fetchSegments(itemId: string): Promise<MediaSegment[]> {
  const data = await jfFetch<JellyfinMediaSegmentDto[]>(`/Items/${itemId}/Segments`);
  return (data ?? []).map((s) => ({
    id: s.Id,
    type: (s.Type ?? 'Intro').toUpperCase() as MediaSegment['type'],
    title: s.Type ?? 'Intro',
    buttonLabel: s.Type === 'Intro' ? 'Skip Intro' : s.Type === 'Recap' ? 'Skip Recap' : s.Type === 'Outro' ? 'Next Episode' : `Skip ${s.Type}`,
    startSeconds: s.StartTicks / TICKS_PER_SECOND,
    endSeconds: s.EndTicks / TICKS_PER_SECOND,
    source: 'jellyfin',
  }));
}

// ---------------------------------------------------------------------------
// Playback info (Phase 4 — consumed by usePlaybackSession)
// ---------------------------------------------------------------------------

export async function fetchPlaybackInfo(
  itemId: string,
  deviceProfile: unknown,
  startTimeTicks?: number
): Promise<JellyfinPlaybackInfoResponse> {
  return jfFetch<JellyfinPlaybackInfoResponse>(`/Items/${itemId}/PlaybackInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      DeviceProfile: deviceProfile,
      MaxStreamingBitrate: undefined,
      StartTimeTicks: startTimeTicks ?? undefined,
      AutoOpenLiveStream: false,
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
      MediaSourceId: undefined,
      AudioStreamIndex: undefined,
      SubtitleStreamIndex: undefined,
      MaxAudioChannels: undefined,
    }),
  });
}
