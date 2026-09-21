import { MediaItem, Season } from '@/types/cinema';
import { MediaSegment } from '@/types/segments';
import * as jellyfinApi from '@/lib/api/jellyfin';
import {
  adaptJellyfinItemToMediaItem,
  adaptJellyfinSeasonToSeason,
  adaptJellyfinEpisodeToEpisode,
  adaptJellyfinSegmentsToMediaSegments,
} from '@/lib/adapters/jellyfinAdapter';

/**
 * Production DinuStream Media Service
 *
 * Exclusively communicates with the live Jellyfin media server.
 * Zero mock data fallbacks.
 */
class MediaService {
  /**
   * Fetch movies from Jellyfin (adapted into MediaItem[])
   */
  async getMovies(limit = 50): Promise<MediaItem[]> {
    try {
      const res = await jellyfinApi.getMovies(limit);
      if (res && res.Items && res.Items.length > 0) {
        return res.Items.map(adaptJellyfinItemToMediaItem);
      }
    } catch (err) {
      console.error('[MediaService] getMovies failed:', err);
    }
    return [];
  }

  /**
   * Fetch series from Jellyfin (adapted into MediaItem[])
   */
  async getSeries(limit = 50): Promise<MediaItem[]> {
    try {
      const res = await jellyfinApi.getSeries(limit);
      if (res && res.Items && res.Items.length > 0) {
        return res.Items.map(adaptJellyfinItemToMediaItem);
      }
    } catch (err) {
      console.error('[MediaService] getSeries failed:', err);
    }
    return [];
  }

  /**
   * Fetch recently added media items
   */
  
  /**
   * Fetch newly added movies specifically
   */
  async getNewlyAddedMovies(limit = 20): Promise<MediaItem[]> {
    try {
      const items = await jellyfinApi.getRecentlyAddedMovies(limit);
      if (items && items.length > 0) {
        return items.map(adaptJellyfinItemToMediaItem);
      }
      // Fallback: Movies sorted by latest
      const allMovies = await this.getMovies(limit);
      if (allMovies && allMovies.length > 0) {
        return [...allMovies].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      }
    } catch (err) {
      console.error('[MediaService] getNewlyAddedMovies failed:', err);
    }
    return [];
  }

  async getRecentlyAdded(limit = 20): Promise<MediaItem[]> {
    try {
      const items = await jellyfinApi.getRecentlyAddedItems(limit);
      if (items && items.length > 0) {
        return items.map(adaptJellyfinItemToMediaItem);
      }
    } catch (err) {
      console.error('[MediaService] getRecentlyAdded failed:', err);
    }
    return [];
  }

  /**
   * Fetch hero item for the cinematic hero banner
   */
    /**
   * Fetch featured items for the multi-slide Hotstar hero carousel
   */
  async getFeaturedItems(limit = 6): Promise<MediaItem[]> {
    try {
      const [movies, series, recent] = await Promise.all([
        this.getMovies(20),
        this.getSeries(10),
        this.getRecentlyAdded(15),
      ]);

      const itemsMap = new Map<string, MediaItem>();

      // Prioritize items with backdrops or strong overviews
      const candidates = [...series, ...movies, ...recent];
      for (const item of candidates) {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, item);
        }
        if (itemsMap.size >= limit) break;
      }

      return Array.from(itemsMap.values());
    } catch (err) {
      console.error('[MediaService] getFeaturedItems failed:', err);
      return [];
    }
  }

  async getHeroItem(): Promise<MediaItem | null> {
    try {
      // Pick first movie from Jellyfin or first recently added
      const recent = await this.getRecentlyAdded(10);
      if (recent.length > 0) {
        // Find one with a valid backdrop if possible
        const withBackdrop = recent.find((m) => m.backdropUrl && !m.backdropUrl.includes('Primary'));
        return withBackdrop || recent[0];
      }
      const movies = await this.getMovies(5);
      if (movies.length > 0) {
        return movies[0];
      }
    } catch (err) {
      console.error('[MediaService] getHeroItem failed:', err);
    }
    return null;
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
    } catch (err) {
      console.error(`[MediaService] getMediaById(${id}) failed:`, err);
    }
    return null;
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
    } catch (err) {
      console.error(`[MediaService] getSeasonsForSeries(${seriesId}) failed:`, err);
    }
    return [];
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
          label: t.DisplayTitle || t.Title || t.Language || 'Audio Track',
          isDefault: Boolean(t.IsDefault),
        }));
      }
    } catch (err) {
      console.error(`[MediaService] getAudioTracks(${mediaId}) failed:`, err);
    }
    return [];
  }

  /**
   * Fetch subtitle streams for custom player
   */
  async getSubtitleTracks(mediaId: string): Promise<Array<{ id: string; label: string; language?: string }>> {
    try {
      const subs = await jellyfinApi.getSubtitleTracks(mediaId);
      if (subs && subs.length > 0) {
        return [
          { id: 'off', label: 'Off' },
          ...subs.map((s) => ({
            id: String(s.Index),
            label: s.DisplayTitle || s.Title || s.Language || 'Subtitles',
            language: s.Language,
          })),
        ];
      }
    } catch (err) {
      console.error(`[MediaService] getSubtitleTracks(${mediaId}) failed:`, err);
    }
    return [{ id: 'off', label: 'Off' }];
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
      // Ignored if server segment plugin not enabled
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
