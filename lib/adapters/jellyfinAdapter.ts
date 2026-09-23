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

/** Human-facing names for the audio codecs Jellyfin reports. */
const AUDIO_CODEC_LABELS: Record<string, string> = {
  truehd: 'Dolby TrueHD',
  eac3: 'Dolby Digital+',
  ac3: 'Dolby Digital',
  dts: 'DTS',
  dtshd: 'DTS-HD',
  flac: 'FLAC',
  aac: 'AAC',
  mp3: 'MP3',
  opus: 'Opus',
  vorbis: 'Vorbis',
  pcm: 'PCM',
};

/** Channel counts mapped to the layout people recognise. */
const CHANNEL_LABELS: Record<number, string> = {
  1: 'Mono',
  2: 'Stereo',
  6: '5.1',
  8: '7.1',
};

/**
 * Trim a raw Jellyfin `DisplayTitle` down to something presentable.
 *
 * Release groups embed site names, bitrates and "DEFAULT"/"FORCED" flags in the
 * track title. Everything is split on the ` - ` separator Jellyfin uses and the
 * noisy segments are dropped; if nothing survives, the caller falls back to the
 * structured codec/channel fields instead.
 */
function sanitiseStreamTitle(raw?: string): string {
  if (!raw) return '';

  const kept = raw
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      // URLs / site names smuggled into the track title
      if (/(https?:\/\/|www\.|\.(com|net|org|cards|to|me|tv)\b)/i.test(part)) return false;
      // Bitrate and container noise
      if (/\b\d+\s*kbps\b/i.test(part)) return false;
      // Jellyfin's own flag suffixes
      if (/^(default|forced|external|undefined|und)$/i.test(part)) return false;
      return true;
    });

  // Keep it to a single short segment — badges are not a place for a sentence.
  const label = kept[0] ?? '';
  return label.length > 28 ? '' : label;
}

/** e.g. `Dolby TrueHD 7.1`, `AAC Stereo`, `English` */
function formatAudioStreamLabel(stream: {
  Codec?: string;
  Channels?: number;
  ChannelLayout?: string;
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
}): string {
  const codec = stream.Codec ? AUDIO_CODEC_LABELS[stream.Codec.toLowerCase()] : undefined;
  const channels =
    (stream.Channels ? CHANNEL_LABELS[stream.Channels] : undefined) ??
    stream.ChannelLayout ??
    undefined;

  if (codec) return channels ? `${codec} ${channels}` : codec;
  if (channels) return channels;

  return (
    sanitiseStreamTitle(stream.DisplayTitle) ||
    sanitiseStreamTitle(stream.Title) ||
    stream.Language?.toUpperCase() ||
    'Audio'
  );
}

/** Subtitles are identified by language, which is all a viewer needs. */
function formatSubtitleStreamLabel(stream: {
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
}): string {
  return (
    stream.Language?.toUpperCase() ||
    sanitiseStreamTitle(stream.DisplayTitle) ||
    sanitiseStreamTitle(stream.Title) ||
    'Subtitles'
  );
}

/** Stable de-duplication, preserving first-seen order. */
function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
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

  /*
    Audio & subtitle track labels.

    Jellyfin's `DisplayTitle` is a raw, unbounded string built from the source
    file — it routinely looks like
    "WWW.SOMESITE.CARDS - [DD+ 5.1 - 192KBPS] - DOLBY DIGITAL+ - DEFAULT".
    Surfacing that verbatim put release-group filenames and bitrates straight
    into the UI as badge text. These now build a short, clean label from the
    structured fields Jellyfin also provides (codec, channel layout, language)
    and only fall back to the raw title after sanitising it.
  */
  const audioFormats = dedupe(
    (jItem.MediaStreams ?? [])
      .filter((s) => s.Type === 'Audio')
      .map(formatAudioStreamLabel)
  );

  const subtitleLanguages = dedupe(
    (jItem.MediaStreams ?? [])
      .filter((s) => s.Type === 'Subtitle')
      .map(formatSubtitleStreamLabel)
  );

  // Posters & Backdrops with WebP compression, retina dimensions, and cache-busting tags
  const primaryTag = jItem.ImageTags?.Primary;
  const posterParams = new URLSearchParams({
    fillWidth: '340',
    fillHeight: '510',
    quality: '85',
    format: 'webp',
  });
  if (primaryTag) posterParams.set('tag', primaryTag);
  const posterUrl = `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Primary?${posterParams.toString()}`;

  const backdropTag = jItem.BackdropImageTags && jItem.BackdropImageTags.length > 0
    ? jItem.BackdropImageTags[0]
    : undefined;
  const backdropParams = new URLSearchParams({
    maxWidth: '1280',
    quality: '85',
    format: 'webp',
  });
  if (backdropTag) backdropParams.set('tag', backdropTag);

  const backdropUrl = backdropTag
    ? `/api/jellyfin/items/${encodeURIComponent(jItem.Id)}/Images/Backdrop?${backdropParams.toString()}`
    : posterUrl;

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

  // Multi-tier thumbnail fallback strategy with WebP 16:9 sizing:
  const epParams = new URLSearchParams({
    fillWidth: '480',
    fillHeight: '270',
    quality: '85',
    format: 'webp',
  });

  let thumbnailUrl = '';
  if (jEpisode.ImageTags && jEpisode.ImageTags.Primary) {
    epParams.set('tag', jEpisode.ImageTags.Primary);
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.Id)}/Images/Primary?${epParams.toString()}`;
  } else if (jEpisode.ParentThumbItemId) {
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.ParentThumbItemId)}/Images/Primary?${epParams.toString()}`;
  } else if (jEpisode.ParentBackdropItemId) {
    const parentBackdropTag = jEpisode.ParentBackdropImageTags?.[0];
    if (parentBackdropTag) epParams.set('tag', parentBackdropTag);
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.ParentBackdropItemId)}/Images/Backdrop/0?${epParams.toString()}`;
  } else if (jEpisode.SeasonId) {
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.SeasonId)}/Images/Primary?${epParams.toString()}`;
  } else if (jEpisode.SeriesId) {
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.SeriesId)}/Images/Primary?${epParams.toString()}`;
  } else {
    thumbnailUrl = `/api/jellyfin/items/${encodeURIComponent(jEpisode.Id)}/Images/Primary?${epParams.toString()}`;
  }

  return {
    id: jEpisode.Id,
    title: jEpisode.Name,
    seasonNumber: jEpisode.ParentIndexNumber ?? 1,
    episodeNumber: jEpisode.IndexNumber ?? 1,
    runtime: ticksToRuntime(jEpisode.RunTimeTicks) || `${totalMinutes}m`,
    overview: jEpisode.Overview || '',
    thumbnailUrl,
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
    seasonNumber: jSeason.IndexNumber ?? 1,
    title: jSeason.Name || (typeof jSeason.IndexNumber === 'number' ? `Season ${jSeason.IndexNumber}` : 'Season 1'),
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
