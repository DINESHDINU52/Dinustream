import { UserProfile, ContinueWatchingItem, MediaBadge } from './cinema';

export interface UserPreferences {
  autoplayNextEpisode: boolean;
  autoSkipIntro: boolean;
  autoSkipRecap: boolean;
  autoSkipOutro: boolean;
  defaultAudio: 'Dolby Atmos (TrueHD 7.1)' | 'Dolby Digital Plus 5.1' | 'Stereo';
  defaultSubtitles: 'Off' | 'English [CC]' | 'Spanish' | 'French';
  playbackQuality: '4K UHD (2160p)' | '1080p FHD' | 'Auto';
  reducedMotion: boolean;
}

export interface WatchHistoryItem {
  id: string;
  mediaId: string;
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  watchedAt: number;
  progressMinutes: number;
  totalMinutes: number;
  completed: boolean;
  episodeId?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  badges?: MediaBadge[];
}

export interface UserProfileData {
  profile: UserProfile;
  continueWatching: ContinueWatchingItem[];
  myList: string[]; // MediaItem ids
  watchHistory: WatchHistoryItem[];
  settings: UserPreferences;
}
