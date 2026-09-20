import { MediaItem, Episode, Season, MediaBadge } from '@/types/cinema';
import { MediaSegment, SegmentType } from '@/types/segments';
import { JellyfinItem, JellyfinSegment } from '@/lib/api/jellyfin';

/**
 * Convert Jellyfin RunTimeTicks to readable runtime string
 * 1 second = 10,000,000 ticks
 */
export function ticksToRuntime(ticks?: number): string {
  if (!ticks || ticks <= 0) return '';
  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Convert Jellyfin RunTimeTicks to duration in seconds
 */
export function ticksToSeconds(ticks?: number): number {
  if (!ticks || ticks <= 0) return 0;
  return Math.floor(ticks / 10000000);
}

/**
 * Adapt a raw Jellyfin Item into the DinuStream MediaItem model
 */
export function adaptJellyfinItemToMediaItem(jItem: JellyfinItem): MediaItem {
  // Extract director & cast from People array
  const directorPerson = jItem.People?.find((p) => p.Type === 'Director');
  const director = directorPerson?.Name || '';

  const cast = jItem.People?.filter((p) => p.Type === 'Actor').map((p) => p.Name) || [];

  // Determine badges from real audio streams & video resolution
  const badges: MediaBadge[] = [];

  const videoStream = jItem.MediaStreams?.find((s) => s.Type === 'Video');
  if (videoStream) {
    if (
      (videoStream.Height && videoStream.Height >= 2160) ||
      (videoStream.Width && videoStream.Width >= 3840) ||
      videoStream.DisplayTitle?.includes('4K') ||
      videoStream.DisplayTitle?.includes('2160p')
    ) {
      badges.push('4K UHD');
    }

    if (
      videoStream.DisplayTitle?.toLowerCase().includes('hdr') ||
      videoStream.DisplayTitle?.toLowerCase().includes('dolby vision') ||
      videoStream.DisplayTitle?.toLowerCase().includes('dv')
    ) {
      badges.push('Dolby Vision');
    }
  }

  const hasAtmos = jItem.MediaStreams?.some(
    (s) =>
      s.Type === 'Audio' &&
      (s.DisplayTitle?.toLowerCase().includes('atmos') ||
        s.Codec?.toLowerCase() === 'truehd' ||
        (s.Channels && s.Channels >= 8))
  );
  if (hasAtmos) {
    badges.push('Dolby Atmos');
  }

  // Extract real audio formats & subtitle tracks from Jellyfin stream metadata
  const audioFormats = jItem.MediaStreams
    ?.filter((s) => s.Type === 'Audio')
    .map((s) => s.DisplayTitle || s.Title || (s.Language ? s.Language.toUpperCase() : 'Audio Track')) || [];

  const subtitleLanguages = jItem.MediaStreams
    ?.filter((s) => s.Type === 'Subtitle')
    .map((s) => s.DisplayTitle || s.Title || (s.Language ? s.Language.toUpperCase() : 'Subtitles')) || [];

  // Posters & Backdrops from real Jellyfin proxy
  const backdropUrl = jItem.BackdropImageTags && jItem.BackdropImageTags.length > 0
    ? `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Backdrop`
    : `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Primary`;

  const posterUrl = `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Primary`;

  const ratingStr = jItem.CommunityRating
    ? `${jItem.CommunityRating.toFixed(1)}/10`
    : undefined;

  return {
    id: jItem.Id,
    title: jItem.Name,
    tagline: jItem.Type === 'Movie' ? 'Private Cinema Presentation' : 'Private Screen Series',
    overview: jItem.Overview || 'Masterfully calibrated private stream for Dinu & Kanmani.',
    type: jItem.Type === 'Series' ? 'series' : 'movie',
    releaseYear: jItem.ProductionYear || new Date().getFullYear(),
    runtime: ticksToRuntime(jItem.RunTimeTicks) || (jItem.Type === 'Series' ? 'Series' : '2h'),
    rating: ratingStr || 'NR',
    genres: jItem.Genres && jItem.Genres.length > 0 ? jItem.Genres : [],
    director: director || undefined,
    cast: cast.length > 0 ? cast : [],
    backdropUrl,
    posterUrl,
    badges,
    hasDolbyIntro: badges.includes('Dolby Atmos'),
    audioFormats,
    subtitleLanguages,
  };
}

/**
 * Adapt a raw Jellyfin Episode into the DinuStream Episode model
 */
export function adaptJellyfinEpisodeToEpisode(jEpisode: JellyfinItem): Episode {
  const positionTicks = jEpisode.UserData?.PlaybackPositionTicks || 0;
  const totalMinutes = Math.floor(ticksToSeconds(jEpisode.RunTimeTicks) / 60) || 50;
  const progressMinutes = positionTicks > 0 ? Math.floor(ticksToSeconds(positionTicks) / 60) : undefined;

  return {
    id: jEpisode.Id,
    title: jEpisode.Name,
    seasonNumber: jEpisode.ParentIndexNumber || 1,
    episodeNumber: jEpisode.IndexNumber || 1,
    runtime: ticksToRuntime(jEpisode.RunTimeTicks) || `${totalMinutes}m`,
    overview: jEpisode.Overview || '',
    thumbnailUrl: `/api/jellyfin/items/${encodeURIComponent(jEpisode.Id)}/Images/Primary`,
    progressMinutes,
    totalMinutes,
  };
}

/**
 * Adapt a raw Jellyfin Season into the DinuStream Season model
 */
export function adaptJellyfinSeasonToSeason(
  jSeason: JellyfinItem,
  episodes: Episode[]
): Season {
  return {
    seasonNumber: jSeason.IndexNumber || 1,
    title: jSeason.Name,
    episodeCount: episodes.length,
    episodes,
  };
}

/**
 * Adapt raw Jellyfin Segments into DinuStream MediaSegments
 */
export function adaptJellyfinSegmentsToMediaSegments(
  jSegments: JellyfinSegment[]
): MediaSegment[] {
  return jSegments.map((seg) => {
    let type: SegmentType = 'INTRO';
    if (seg.Type === 'Recap') type = 'RECAP';
    else if (seg.Type === 'Outro') type = 'OUTRO';
    else if (seg.Type === 'Preview') type = 'PREVIEW';
    else if (seg.Type === 'Commercial') type = 'COMMERCIAL';

    return {
      id: seg.Id,
      type,
      title: `${seg.Type} Segment`,
      buttonLabel: `SKIP ${seg.Type.toUpperCase()}`,
      startSeconds: ticksToSeconds(seg.StartTicks),
      endSeconds: ticksToSeconds(seg.EndTicks),
      source: 'jellyfin',
    };
  });
}
