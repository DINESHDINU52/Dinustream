// Map Jellyfin DTOs -> DinuStream domain types.
// Pure functions; no side effects. This is the single seam where the backend
// shape is translated into what the UI already renders.

import { MediaItem, MediaBadge, Episode, Season, ContinueWatchingItem } from '@/types/cinema';
import { SearchResultItem } from '@/types/search';
import { JellyfinBaseItem, JellyfinMediaStream, JellyfinSearchHint } from './types';
import { TICKS_PER_SECOND } from './client';

export function ticksToSeconds(ticks?: number): number {
  return (ticks ?? 0) / TICKS_PER_SECOND;
}

export function formatRuntime(ticks?: number): string {
  const secs = Math.round(ticksToSeconds(ticks));
  if (!secs || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Build a same-origin Jellyfin image URL.
 * Image endpoints are anonymous, so these work directly in <img>/next/image.
 */
export function imageUrl(
  item: JellyfinBaseItem | JellyfinSearchHint | undefined | null,
  type: 'Primary' | 'Backdrop' | 'Logo' | 'Thumb' | 'Banner',
  opts?: { maxWidth?: number; maxHeight?: number; tag?: string }
): string {
  if (!item) return '';
  const id = 'ItemId' in item ? item.ItemId : (item as JellyfinBaseItem).Id;
  if (!id) return '';

  const base = item as JellyfinBaseItem;
  const tag =
    opts?.tag ??
    ('ItemId' in item ? item.PrimaryImageTag : undefined) ??
    base.ImageTags?.[type] ??
    (type === 'Backdrop' ? base.BackdropImageTags?.[0] : undefined);

  // No known artwork for this image type — returning the endpoint would 404.
  // Callers fall back to posterUrl when this is empty.
  if (!tag) return '';

  let url = `/jellyfin/Items/${id}/Images/${type}`;
  const p = new URLSearchParams();
  if (opts?.maxWidth) p.set('maxWidth', String(opts.maxWidth));
  if (opts?.maxHeight) p.set('maxHeight', String(opts.maxHeight));
  if (tag) p.set('tag', tag);
  const q = p.toString();
  return q ? `${url}?${q}` : url;
}

function deriveBadges(item: JellyfinBaseItem): MediaBadge[] {
  const badges: MediaBadge[] = [];
  const streams = item.MediaStreams ?? [];
  const video = streams.find((s) => s.Type === 'Video');
  const audio = streams.filter((s) => s.Type === 'Audio');

  const width = video?.Width ?? 0;
  if (width >= 3840) badges.push('4K UHD');

  const audioText = audio
    .map((a) => `${a.Codec ?? ''} ${a.DisplayTitle ?? ''} ${a.ChannelLayout ?? ''}`.toLowerCase())
    .join(' ');

  if (audioText.includes('atmos') || audioText.includes('truehd')) badges.push('Dolby Atmos');
  if (video?.VideoRangeType?.toLowerCase().includes('dovi') || audioText.includes('dolby vision')) {
    badges.push('Dolby Vision');
  }
  if (video?.VideoRange === 'HDR10+' || audioText.includes('hdr10+')) badges.push('HDR10+');

  return badges;
}

function deriveDirector(item: JellyfinBaseItem): string | undefined {
  return item.People?.find((p) => p.Type === 'Director')?.Name;
}

function deriveCast(item: JellyfinBaseItem): string[] | undefined {
  const actors = item.People?.filter((p) => p.Type === 'Actor' || p.Type === 'GuestStar').map((p) => p.Name ?? '');
  return actors && actors.length > 0 ? actors.slice(0, 12) : undefined;
}

function deriveAudioFormats(item: JellyfinBaseItem): string[] | undefined {
  const tracks = (item.MediaStreams ?? [])
    .filter((s) => s.Type === 'Audio')
    .map((s) => s.DisplayTitle ?? s.Title ?? s.Codec ?? '')
    .filter(Boolean);
  return tracks.length ? tracks : undefined;
}

function deriveSubtitleLanguages(item: JellyfinBaseItem): string[] | undefined {
  const langs = (item.MediaStreams ?? [])
    .filter((s) => s.Type === 'Subtitle')
    .map((s) => s.DisplayLanguage ?? s.Language ?? '')
    .filter(Boolean);
  return langs.length ? langs : undefined;
}

function deriveMatchScore(item: JellyfinBaseItem): number | undefined {
  if (item.CriticRating != null) return Math.round(item.CriticRating);
  if (item.CommunityRating != null) return Math.round(item.CommunityRating * 10);
  return undefined;
}

/** Map a Jellyfin BaseItemDto (Movie/Series/Season/Episode) to a MediaItem. */
export function mapToMediaItem(item: JellyfinBaseItem): MediaItem {
  const type = item.Type === 'Series' ? 'series' : 'movie';
  const runtime = item.RunTimeTicks ? formatRuntime(item.RunTimeTicks) : '';
  return {
    id: item.Id ?? '',
    title: item.Name ?? item.OriginalTitle ?? 'Untitled',
    tagline: item.Taglines?.[0],
    overview: item.Overview ?? '',
    type,
    backdropUrl: imageUrl(item, 'Backdrop', { maxWidth: 1920 }) || imageUrl(item, 'Primary', { maxWidth: 1920 }),
    posterUrl: imageUrl(item, 'Primary', { maxWidth: 600 }),
    releaseYear: item.ProductionYear ?? 0,
    rating: item.OfficialRating ?? '',
    runtime,
    matchScore: deriveMatchScore(item),
    genres: item.Genres ?? [],
    badges: deriveBadges(item),
    director: deriveDirector(item),
    cast: deriveCast(item),
    audioFormats: deriveAudioFormats(item),
    subtitleLanguages: deriveSubtitleLanguages(item),
    seasonsCount: type === 'series' ? item.ChildCount : undefined,
  };
}

export function mapToEpisode(item: JellyfinBaseItem): Episode {
  const userData = item.UserData;
  const progressSeconds = Math.round(ticksToSeconds(userData?.PlaybackPositionTicks));
  const totalSeconds = Math.round(ticksToSeconds(item.RunTimeTicks));
  return {
    id: item.Id ?? '',
    seasonNumber: item.ParentIndexNumber ?? 0,
    episodeNumber: item.IndexNumber ?? 0,
    title: item.Name ?? `Episode ${item.IndexNumber ?? ''}`.trim(),
    overview: item.Overview ?? '',
    runtime: item.RunTimeTicks ? formatRuntime(item.RunTimeTicks) : '',
    thumbnailUrl: imageUrl(item, 'Primary', { maxWidth: 480 }),
    progressMinutes: progressSeconds ? Math.round(progressSeconds / 60) : undefined,
    totalMinutes: totalSeconds ? Math.round(totalSeconds / 60) : undefined,
  };
}

export function mapToSeason(item: JellyfinBaseItem): Season {
  return {
    seasonNumber: item.IndexNumber ?? 0,
    title: item.Name ?? `Season ${item.IndexNumber ?? ''}`.trim(),
    episodeCount: item.ChildCount ?? item.RecursiveItemCount ?? 0,
    episodes: [],
  };
}

export function mapToContinueWatching(item: JellyfinBaseItem): ContinueWatchingItem {
  const media = mapToMediaItem(item);
  const positionSeconds = ticksToSeconds(item.UserData?.PlaybackPositionTicks);
  const totalSeconds = ticksToSeconds(item.RunTimeTicks);
  const isEpisode = item.Type === 'Episode';
  return {
    ...media,
    progressMinutes: Math.round(positionSeconds / 60),
    totalMinutes: totalSeconds ? Math.round(totalSeconds / 60) : Math.round(positionSeconds / 60),
    lastWatched: item.UserData?.LastPlayedDate ?? '',
    currentSeasonNumber: isEpisode ? item.ParentIndexNumber : undefined,
    currentEpisodeNumber: isEpisode ? item.IndexNumber : undefined,
    currentEpisodeTitle: isEpisode ? item.Name : undefined,
  };
}

export function mapSearchHint(hint: JellyfinSearchHint): SearchResultItem {
  const item: JellyfinBaseItem = {
    Id: hint.ItemId,
    Name: hint.Name,
    Type: hint.Type,
    ProductionYear: hint.ProductionYear,
    RunTimeTicks: hint.RunTimeTicks,
    SeriesName: hint.SeriesName,
    ParentIndexNumber: hint.ParentIndexNumber,
    IndexNumber: hint.IndexNumber,
    ImageTags: { Primary: hint.PrimaryImageTag },
    BackdropImageTags: hint.BackdropImageTag ? [hint.BackdropImageTag] : undefined,
  };
  const media = mapToMediaItem(item);
  const type =
    hint.Type === 'Series' ? 'series' : hint.Type === 'Episode' ? 'episode' : hint.Type === 'Audio' ? 'music' : 'movie';
  return {
    id: media.id,
    title: media.title,
    type,
    overview: '',
    posterUrl: media.posterUrl,
    backdropUrl: media.backdropUrl,
    releaseYear: media.releaseYear,
    rating: media.rating,
    runtime: media.runtime,
    genres: media.genres,
    badges: media.badges,
    seriesId: hint.Type === 'Episode' ? undefined : undefined,
    seriesTitle: hint.SeriesName,
    seasonNumber: hint.ParentIndexNumber,
    episodeNumber: hint.IndexNumber,
  };
}
