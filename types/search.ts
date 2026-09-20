import { MediaBadge } from './cinema';

export type SearchCategory = 'all' | 'movie' | 'series' | 'episode' | 'music';

export interface SearchResultItem {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'episode' | 'music';
  overview: string;
  posterUrl: string;
  backdropUrl?: string;
  releaseYear: number;
  rating?: string;
  runtime?: string;
  genres: string[];
  badges: MediaBadge[];
  language?: string; // 'English', 'Tamil', 'Spanish', 'French', 'Japanese'
  resolution?: '4K UHD' | '1080p FHD' | '720p HD';
  audioFormat?: 'Dolby Atmos' | 'Dolby Digital Plus 5.1' | 'Spatial Audio' | 'Stereo';
  seriesId?: string;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  artist?: string;
  trackCount?: number;
  isRecentlyAdded?: boolean;
}

export interface SearchFilters {
  category: SearchCategory;
  genre: string; // 'all' or specific genre
  year: string; // 'all' | '2024' | '2023' | '2022' | 'older'
  language: string; // 'all' | 'English' | 'Tamil' | 'Spanish' | 'French' | 'Japanese'
  resolution: string; // 'all' | '4K UHD' | '1080p FHD'
  audio: string; // 'all' | 'Dolby Atmos' | 'Dolby Digital Plus 5.1' | 'Spatial Audio'
  recentlyAddedOnly: boolean;
}
