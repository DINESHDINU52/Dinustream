export type UserProfileId = 'dinu' | 'kanmani';

export interface UserProfile {
  id: UserProfileId;
  name: string;
  title: string;
  avatarUrl: string;
  accentColor: string;
  glowColor: string;
  favoriteGenre: string;
  isOnline: boolean;
  statusMessage?: string;
}

export type MediaBadge =
  | '4K UHD'
  | 'Dolby Atmos'
  | 'Dolby Vision'
  | 'HDR10+'
  | 'IMAX Enhanced'
  | 'Spatial Audio';

export type MediaType = 'movie' | 'series';

export interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  runtime: string;
  thumbnailUrl: string;
  progressMinutes?: number;
  totalMinutes?: number;
  skipMarkers?: {
    introStart: number;
    introEnd: number;
    recapStart?: number;
    recapEnd?: number;
    outroStart?: number;
  };
  videoUrl?: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: string;
  title: string;
  tagline?: string;
  overview: string;
  type: MediaType;
  backdropUrl: string;
  posterUrl: string;
  releaseYear: number;
  rating: string;
  runtime: string;
  matchScore?: number;
  genres: string[];
  badges: MediaBadge[];
  director?: string;
  cast?: string[];
  hasDolbyIntro?: boolean;
  audioFormats?: string[];
  subtitleLanguages?: string[];
  videoUrl?: string;
  trailerUrl?: string;
  similarTitles?: string[];
  seasonsCount?: number;
  seasons?: Season[];
}

export interface ContinueWatchingItem extends MediaItem {
  progressMinutes: number;
  totalMinutes: number;
  lastWatched: string;
  currentSeasonNumber?: number;
  currentEpisodeNumber?: number;
  currentEpisodeTitle?: string;
}
