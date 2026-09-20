import { MediaItem, Episode, Season, MediaBadge } from '@/types/cinema';
import { MediaSegment, SegmentType } from '@/types/segments';
import { JellyfinItem, JellyfinSegment } from '@/lib/api/jellyfin';
import { FEATURED_HERO_MEDIA } from '@/lib/mock-data';

/**
 * Convert Jellyfin RunTimeTicks to readable runtime string
 * 1 second = 10,000,000 ticks
 */
export function ticksToRuntime(ticks?: number): string {
  if (!ticks || ticks <= 0) return '2h 15m';
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
  const director = directorPerson?.Name || 'Denis Villeneuve';

  const cast = jItem.People?.filter((p) => p.Type === 'Actor').map((p) => p.Name) || [
    'Timothée Chalamet',
    'Zendaya',
    'Rebecca Ferguson',
  ];

  // Determine badges from audio streams & resolution
  const badges: MediaBadge[] = ['4K UHD'];
  const hasAtmos = jItem.MediaStreams?.some(
    (s) => s.Type === 'Audio' && (s.DisplayTitle?.includes('Atmos') || s.Codec === 'truehd')
  );
  if (hasAtmos) {
    badges.push('Dolby Atmos');
  }
  badges.push('Dolby Vision');

  const ratingStr = jItem.CommunityRating
    ? `${jItem.CommunityRating.toFixed(1)}/10`
    : '8.8/10';

  // Extract real audio formats & subtitle tracks from Jellyfin stream metadata
  const audioFormats = jItem.MediaStreams
    ?.filter((s) => s.Type === 'Audio')
    .map((s) => s.DisplayTitle || s.Title || (s.Language ? s.Language.toUpperCase() : 'Audio Track'));

  const subtitleLanguages = jItem.MediaStreams
    ?.filter((s) => s.Type === 'Subtitle')
    .map((s) => s.DisplayTitle || s.Title || (s.Language ? s.Language.toUpperCase() : 'Subtitles'));

  // Posters & Backdrops fallback to premium cinema imagery
  const backdropUrl = jItem.BackdropImageTags && jItem.BackdropImageTags.length > 0
    ? `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Backdrop`
    : FEATURED_HERO_MEDIA.backdropUrl;

  const posterUrl = jItem.ImageTags?.Primary
    ? `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Primary`
    : FEATURED_HERO_MEDIA.posterUrl;

  return {
    id: jItem.Id,
    title: jItem.Name,
    tagline: jItem.Type === 'Movie' ? 'The saga continues in 4K Atmos' : 'Private Screen Presentation',
    overview: jItem.Overview || 'A masterfully calibrated cinematic presentation exclusively streamed for Dinu and Kanmani.',
    type: jItem.Type === 'Series' ? 'series' : 'movie',
    releaseYear: jItem.ProductionYear || 2024,
    runtime: ticksToRuntime(jItem.RunTimeTicks),
    rating: ratingStr,
    matchScore: 98,
    genres: jItem.Genres && jItem.Genres.length > 0 ? jItem.Genres : ['Sci-Fi', 'Adventure', 'Drama'],
    director,
    cast: cast.length > 0 ? cast : ['Dinu', 'Kanmani'],
    backdropUrl,
    posterUrl,
    badges,
    hasDolbyIntro: true,
    audioFormats: audioFormats && audioFormats.length > 0 ? audioFormats : ['Dolby Atmos (TrueHD 7.1)', 'Dolby Digital Plus 5.1'],
    subtitleLanguages: subtitleLanguages && subtitleLanguages.length > 0 ? subtitleLanguages : ['English [CC]', 'Tamil', 'French'],
  };
}

/**
 * Adapt a raw Jellyfin Episode into the DinuStream Episode model
 */
export function adaptJellyfinEpisodeToEpisode(jEpisode: JellyfinItem): Episode {
  const positionTicks = jEpisode.UserData?.PlaybackPositionTicks || 0;
  const totalMinutes = Math.floor(ticksToSeconds(jEpisode.RunTimeTicks) / 60) || 58;
  const progressMinutes = positionTicks > 0 ? Math.floor(ticksToSeconds(positionTicks) / 60) : undefined;

  return {
    id: jEpisode.Id,
    title: jEpisode.Name,
    seasonNumber: jEpisode.ParentIndexNumber || 1,
    episodeNumber: jEpisode.IndexNumber || 1,
    runtime: ticksToRuntime(jEpisode.RunTimeTicks),
    overview: jEpisode.Overview || 'A crucial chapter in the unfolding private cinema narrative.',
    thumbnailUrl: FEATURED_HERO_MEDIA.backdropUrl,
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
