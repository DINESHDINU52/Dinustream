import { MediaItem, Season } from '@/types/cinema';
import { MediaSegment } from '@/types/segments';
import * as jellyfinApi from '@/lib/api/jellyfin';
import {
  adaptJellyfinItemToMediaItem,
  adaptJellyfinSeasonToSeason,
  adaptJellyfinEpisodeToEpisode,
  adaptJellyfinSegmentsToMediaSegments,
} from '@/lib/adapters/jellyfinAdapter';
import { mediaCache } from '@/lib/cache/mediaCache';

/**
 * Production DinuStream Media Service
 *
 * Exclusively communicates with the live Jellyfin media server.
 * Enhanced with multi-tier Stale-While-Revalidate caching for instant card and catalog rendering.
 */
class MediaService {
  /**
   * Fetch movies from Jellyfin (adapted into MediaItem[]) with 10-minute cache
   */
  async getMovies(limit = 50): Promise<MediaItem[]> {
    return mediaCache.getOrFetch(`movies_${limit}`, async () => {
      try {
        const res = await jellyfinApi.getMovies(limit);
        if (res && res.Items && res.Items.length > 0) {
          return res.Items.map(adaptJellyfinItemToMediaItem);
        }
      } catch (err) {
        console.error('[MediaService] getMovies failed:', err);
      }
      return [];
    }, 10 * 60 * 1000);
  }

  /**
   * Fetch series from Jellyfin (adapted into MediaItem[]) with 10-minute cache
   */
  async getSeries(limit = 50): Promise<MediaItem[]> {
    return mediaCache.getOrFetch(`series_${limit}`, async () => {
      try {
        const res = await jellyfinApi.getSeries(limit);
        if (res && res.Items && res.Items.length > 0) {
          return res.Items.map(adaptJellyfinItemToMediaItem);
        }
      } catch (err) {
        console.error('[MediaService] getSeries failed:', err);
      }
      return [];
    }, 10 * 60 * 1000);
  }

  /**
   * Fetch newly added movies specifically with 5-minute cache
   */
  async getNewlyAddedMovies(limit = 20): Promise<MediaItem[]> {
    return mediaCache.getOrFetch(`new_movies_${limit}`, async () => {
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
    }, 5 * 60 * 1000);
  }

  /**
   * Fetch recently added media items with 5-minute cache
   */
  async getRecentlyAdded(limit = 20): Promise<MediaItem[]> {
    return mediaCache.getOrFetch(`recent_${limit}`, async () => {
      try {
        const items = await jellyfinApi.getRecentlyAddedItems(limit);
        if (items && items.length > 0) {
          return items.map(adaptJellyfinItemToMediaItem);
        }
      } catch (err) {
        console.error('[MediaService] getRecentlyAdded failed:', err);
      }
      return [];
    }, 5 * 60 * 1000);
  }

  /**
   * Fetch featured items for the multi-slide DinuStream hero carousel
   */
  async getFeaturedItems(limit = 7): Promise<MediaItem[]> {
    return mediaCache.getOrFetch(`featured_${limit}`, async () => {
      try {
        const [movies, series, recent] = await Promise.all([
          this.getMovies(25),
          this.getSeries(15),
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
    }, 10 * 60 * 1000);
  }

  async getHeroItem(): Promise<MediaItem | null> {
    const featured = await this.getFeaturedItems(1);
    return featured.length > 0 ? featured[0] : null;
  }

  /**
   * Fetch item details by ID with 15-minute cache
   */
  async getMediaById(id: string): Promise<MediaItem | null> {
    return mediaCache.getOrFetch(`media_${id}`, async () => {
      try {
        const jItem = await jellyfinApi.getItemDetails(id);
        if (jItem && jItem.Name) {
          return adaptJellyfinItemToMediaItem(jItem);
        }
      } catch (err) {
        console.error(`[MediaService] getMediaById(${id}) failed:`, err);
      }
      return null;
    }, 15 * 60 * 1000);
  }

  /**
   * Fetch all seasons and their episodes for a given series with 15-minute cache
   */
  async getSeasonsForSeries(seriesId: string): Promise<Season[]> {
    return mediaCache.getOrFetch(`seasons_${seriesId}`, async () => {
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
    }, 15 * 60 * 1000);
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
   * Fetch audio streams for custom player with 15-minute cache
   */
  async getAudioTracks(mediaId: string): Promise<Array<{ id: string; label: string; isDefault: boolean }>> {
    return mediaCache.getOrFetch(`audio_${mediaId}`, async () => {
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
    }, 15 * 60 * 1000);
  }

  /**
   * Fetch subtitle streams for custom player with 15-minute cache
   */
  async getSubtitleTracks(mediaId: string): Promise<Array<{ id: string; label: string; language?: string }>> {
    return mediaCache.getOrFetch(`subs_${mediaId}`, async () => {
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
    }, 15 * 60 * 1000);
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

  /**
   * Invalidate local cache on demand
   */
  invalidateCache(prefix?: string): void {
    mediaCache.invalidate(prefix);
  }
}

export const mediaService = new MediaService();
