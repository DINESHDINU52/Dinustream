import { MediaItem, Season } from '@/types/cinema';
import { MediaSegment } from '@/types/segments';
import * as jellyfinApi from '@/lib/api/jellyfin';
import {
  adaptJellyfinItemToMediaItem,
  adaptJellyfinSeasonToSeason,
  adaptJellyfinEpisodeToEpisode,
  adaptJellyfinSegmentsToMediaSegments,
} from '@/lib/adapters/jellyfinAdapter';
import {
  MOCK_MOVIES,
  MOCK_SERIES,
  FEATURED_HERO_MEDIA,
  getMediaById as getMockMediaById,
} from '@/lib/mock-data';
import { getSeasonsForSeries as getMockSeasonsForSeries } from '@/lib/mock-series';

/**
 * High-Level DinuStream Media Service
 *
 * Provides a clean abstraction that delegates to the Jellyfin API Client & Adapter,
 * while transparently providing graceful local mock data fallbacks.
 */
class MediaService {
  /**
   * Fetch movies from Jellyfin (adapted into MediaItem[])
   */
  async getMovies(): Promise<MediaItem[]> {
    try {
      const res = await jellyfinApi.getMovies();
      if (res && res.Items && res.Items.length > 0) {
        return res.Items.map(adaptJellyfinItemToMediaItem);
      }
    } catch {
      // Fallback
    }
    return MOCK_MOVIES;
  }

  /**
   * Fetch series from Jellyfin (adapted into MediaItem[])
   */
  async getSeries(): Promise<MediaItem[]> {
    try {
      const res = await jellyfinApi.getSeries();
      if (res && res.Items && res.Items.length > 0) {
        return res.Items.map(adaptJellyfinItemToMediaItem);
      }
    } catch {
      // Fallback
    }
    return MOCK_SERIES;
  }

  /**
   * Fetch item details by ID
   */
  async getMediaById(id: string): Promise<MediaItem | null> {
    try {
      const jItem = await jellyfinApi.getItemDetails(id);
      if (jItem && jItem.Name) {
        return adaptJellyfinItemToMediaItem(jItem);
      }
    } catch {
      // Fallback
    }
    return getMockMediaById(id) || FEATURED_HERO_MEDIA;
  }

  /**
   * Fetch all seasons and their episodes for a given series
   */
  async getSeasonsForSeries(seriesId: string): Promise<Season[]> {
    try {
      const [jSeasons, jEpisodes] = await Promise.all([
        jellyfinApi.getSeasons(seriesId),
        jellyfinApi.getEpisodes(seriesId),
      ]);

      if (jSeasons && jSeasons.length > 0) {
        const episodes = jEpisodes.map(adaptJellyfinEpisodeToEpisode);

        return jSeasons.map((s) => {
          const seasonEpisodes = episodes.filter(
            (e) => e.seasonNumber === (s.IndexNumber || 1)
          );
          return adaptJellyfinSeasonToSeason(s, seasonEpisodes);
        });
      }
    } catch {
      // Fallback
    }
    return getMockSeasonsForSeries(seriesId);
  }

  /**
   * Fetch resume playback position for a media item in seconds
   */
  async getResumePosition(mediaId: string): Promise<number> {
    try {
      const res = await jellyfinApi.getResumePosition(mediaId);
      return res.positionSeconds;
    } catch {
      return 0;
    }
  }

  /**
   * Fetch audio streams for custom player
   */
  async getAudioTracks(mediaId: string): Promise<Array<{ id: string; label: string; isDefault: boolean }>> {
    try {
      const tracks = await jellyfinApi.getAudioTracks(mediaId);
      if (tracks && tracks.length > 0) {
        return tracks.map((t) => ({
          id: String(t.Index),
          label: t.DisplayTitle || t.Title || t.Language || 'Surround Sound',
          isDefault: Boolean(t.IsDefault),
        }));
      }
    } catch {
      // Fallback
    }
    return [
      { id: '1', label: 'Dolby Atmos (TrueHD 7.1)', isDefault: true },
      { id: '2', label: 'Dolby Digital Plus 5.1', isDefault: false },
      { id: '3', label: 'French Stereo', isDefault: false },
    ];
  }

  /**
   * Fetch subtitle streams for custom player
   */
  async getSubtitleTracks(mediaId: string): Promise<Array<{ id: string; label: string; language?: string }>> {
    try {
      const subs = await jellyfinApi.getSubtitleTracks(mediaId);
      if (subs && subs.length > 0) {
        return subs.map((s) => ({
          id: String(s.Index),
          label: s.DisplayTitle || s.Title || s.Language || 'Subtitles',
          language: s.Language,
        }));
      }
    } catch {
      // Fallback
    }
    return [
      { id: 'off', label: 'Off' },
      { id: '1', label: 'English [CC]', language: 'eng' },
      { id: '2', label: 'Spanish', language: 'spa' },
      { id: '3', label: 'French', language: 'fra' },
    ];
  }

  /**
   * Fetch media segments (Intro/Recap/Outro)
   */
  async getMediaSegments(mediaId: string): Promise<MediaSegment[]> {
    try {
      const segments = await jellyfinApi.getMediaSegments(mediaId);
      if (segments && segments.length > 0) {
        return adaptJellyfinSegmentsToMediaSegments(segments);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * Report playback position telemetry
   */
  async reportProgress(mediaId: string, seconds: number, isPaused: boolean): Promise<void> {
    const positionTicks = Math.floor(seconds * 10000000);
    await jellyfinApi.reportPlaybackProgress(mediaId, positionTicks, isPaused);
  }
}

export const mediaService = new MediaService();
