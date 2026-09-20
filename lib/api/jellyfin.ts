/**
 * DinuStream Jellyfin API Client
 *
 * Communicates with the Jellyfin Media Server on Oracle Cloud.
 * Routed through the Next.js API proxy to keep API keys and internal IPs safe.
 */

// --- Raw Jellyfin Data Types ---

export interface JellyfinUserView {
  Id: string;
  Name: string;
  CollectionType: string; // 'movies', 'tvshows', etc.
}

export interface JellyfinMediaStream {
  Type: 'Audio' | 'Video' | 'Subtitle';
  Index: number;
  Codec: string;
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
  IsDefault: boolean;
  Channels?: number;
  ChannelLayout?: string;
  BitRate?: number;
  SampleRate?: number;
}

export interface JellyfinUserData {
  PlaybackPositionTicks: number;
  PlayCount: number;
  IsFavorite: boolean;
  Played: boolean;
  LastPlayedDate?: string;
}

export interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type: 'Actor' | 'Director' | 'Writer' | 'Producer';
  PrimaryImageTag?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  Overview?: string;
  Type: 'Movie' | 'Series' | 'Season' | 'Episode';
  ProductionYear?: number;
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  Genres?: string[];
  People?: JellyfinPerson[];
  MediaStreams?: JellyfinMediaStream[];
  UserData?: JellyfinUserData;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  IndexNumber?: number; // Episode number
  ParentIndexNumber?: number; // Season number
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  Path?: string;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface JellyfinPlaybackInfo {
  MediaSources: Array<{
    Id: string;
    Path?: string;
    Container: string;
    MediaStreams: JellyfinMediaStream[];
    SupportsDirectStream: boolean;
    SupportsTranscoding: boolean;
    Bitrate?: number;
  }>;
  PlaySessionId?: string;
}

export interface JellyfinSegment {
  Id: string;
  ItemId: string;
  Type: 'Intro' | 'Outro' | 'Recap' | 'Preview' | 'Commercial';
  StartTicks: number;
  EndTicks: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_JELLYFIN_PROXY_URL || '/api/jellyfin';

async function fetchJellyfin<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown Jellyfin API error');
    throw new Error(`Jellyfin API (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * 1. Libraries (User Views)
 */
export async function getLibraries(): Promise<JellyfinUserView[]> {
  const res = await fetchJellyfin<{ Items: JellyfinUserView[] }>('/user-views');
  return res.Items || [];
}

/**
 * 2. Movies
 */
export async function getMovies(limit = 50, startIndex = 0): Promise<JellyfinItemsResponse> {
  return fetchJellyfin<JellyfinItemsResponse>(
    `/items?includeItemTypes=Movie&recursive=true&limit=${limit}&startIndex=${startIndex}&fields=MediaStreams,Overview,Genres,People,UserData`
  );
}

/**
 * 3. Series
 */
export async function getSeries(limit = 50, startIndex = 0): Promise<JellyfinItemsResponse> {
  return fetchJellyfin<JellyfinItemsResponse>(
    `/items?includeItemTypes=Series&recursive=true&limit=${limit}&startIndex=${startIndex}&fields=Overview,Genres,People,UserData`
  );
}

/**
 * 4. Seasons
 */
export async function getSeasons(seriesId: string): Promise<JellyfinItem[]> {
  const res = await fetchJellyfin<{ Items: JellyfinItem[] }>(
    `/shows/${encodeURIComponent(seriesId)}/seasons?fields=Overview,UserData`
  );
  return res.Items || [];
}

/**
 * 5. Episodes
 */
export async function getEpisodes(seriesId: string, seasonId?: string): Promise<JellyfinItem[]> {
  const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}&fields=MediaStreams,Overview,UserData` : '?fields=MediaStreams,Overview,UserData';
  const res = await fetchJellyfin<{ Items: JellyfinItem[] }>(
    `/shows/${encodeURIComponent(seriesId)}/episodes${query}`
  );
  return res.Items || [];
}

/**
 * 6. Item Details
 */
export async function getItemDetails(itemId: string): Promise<JellyfinItem> {
  return fetchJellyfin<JellyfinItem>(
    `/items/${encodeURIComponent(itemId)}?fields=MediaStreams,Overview,Genres,People,UserData,BackdropImageTags`
  );
}

/**
 * 7. Playback Information
 */
export async function getPlaybackInfo(itemId: string): Promise<JellyfinPlaybackInfo> {
  return fetchJellyfin<JellyfinPlaybackInfo>(
    `/items/${encodeURIComponent(itemId)}/playback-info`,
    { method: 'POST' }
  );
}

/**
 * 8. Playback Progress
 */
export async function reportPlaybackProgress(
  itemId: string,
  positionTicks: number,
  isPaused: boolean,
  playSessionId?: string
): Promise<void> {
  await fetchJellyfin('/sessions/playing/progress', {
    method: 'POST',
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: positionTicks,
      IsPaused: isPaused,
      PlaySessionId: playSessionId,
    }),
  }).catch(() => {
    // Non-blocking telemetry
  });
}

/**
 * 9. Resume Position (calculated in seconds)
 */
export async function getResumePosition(itemId: string): Promise<{ positionSeconds: number; ticks: number }> {
  try {
    const item = await getItemDetails(itemId);
    const ticks = item.UserData?.PlaybackPositionTicks || 0;
    // 1 second = 10,000,000 ticks in Jellyfin
    return {
      positionSeconds: Math.floor(ticks / 10000000),
      ticks,
    };
  } catch {
    return { positionSeconds: 0, ticks: 0 };
  }
}

/**
 * 10. Audio Tracks
 */
export async function getAudioTracks(itemId: string): Promise<JellyfinMediaStream[]> {
  const item = await getItemDetails(itemId);
  return (item.MediaStreams || []).filter((stream) => stream.Type === 'Audio');
}

/**
 * 11. Subtitle Tracks
 */
export async function getSubtitleTracks(itemId: string): Promise<JellyfinMediaStream[]> {
  const item = await getItemDetails(itemId);
  return (item.MediaStreams || []).filter((stream) => stream.Type === 'Subtitle');
}

/**
 * 12. Media Segments (Intro, Recap, Outro)
 */
export async function getMediaSegments(itemId: string): Promise<JellyfinSegment[]> {
  try {
    const res = await fetchJellyfin<{ Items: JellyfinSegment[] }>(
      `/items/${encodeURIComponent(itemId)}/segments`
    );
    return res.Items || [];
  } catch {
    // If server segment plugin not installed, return empty array
    return [];
  }
}

/**
 * 13. Global Search across Movies, Series, Episodes, Audio
 */
export async function searchJellyfin(
  query: string,
  includeItemTypes: string = 'Movie,Series,Episode,Audio'
): Promise<JellyfinItem[]> {
  try {
    const res = await fetchJellyfin<JellyfinItemsResponse>(
      `/Items?searchTerm=${encodeURIComponent(query)}&includeItemTypes=${encodeURIComponent(
        includeItemTypes
      )}&recursive=true&limit=30`
    );
    return res.Items || [];
  } catch {
    return [];
  }
}
