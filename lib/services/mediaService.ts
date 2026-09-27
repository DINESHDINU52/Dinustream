import { MediaItem, Season } from '@/types/cinema';
import { MOCK_MEDIA_ITEMS } from '@/lib/mock-data';
import {
  fetchFeaturedItems,
  fetchMovies,
  fetchSeries,
  fetchRecentlyAdded,
  fetchItem,
  fetchSeasons,
  fetchEpisodes,
  fetchItemsBySearch,
} from '@/lib/jellyfin/queries';

// When NEXT_PUBLIC_DEMO_MODE=1 the in-memory mock catalog is used and no
// backend is required. In production this is 0 and every call hits Jellyfin;
// failures are swallowed per-method so the home page can still render an empty
// state rather than crash.
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const mediaService = {
  async getFeaturedItems(count = 7, _forceRefresh = false): Promise<MediaItem[]> {
    if (DEMO) return MOCK_MEDIA_ITEMS.slice(0, count);
    try {
      return await fetchFeaturedItems(count);
    } catch {
      return [];
    }
  },

  async getMovies(count = 50, _forceRefresh = false): Promise<MediaItem[]> {
    if (DEMO) return MOCK_MEDIA_ITEMS.filter((i) => i.type === 'movie').slice(0, count);
    try {
      return await fetchMovies(count);
    } catch {
      return [];
    }
  },

  async getSeries(count = 20, _forceRefresh = false): Promise<MediaItem[]> {
    if (DEMO) return MOCK_MEDIA_ITEMS.filter((i) => i.type === 'series').slice(0, count);
    try {
      return await fetchSeries(count);
    } catch {
      return [];
    }
  },

  async getRecentlyAdded(count = 20, _forceRefresh = false): Promise<MediaItem[]> {
    if (DEMO) return [...MOCK_MEDIA_ITEMS].reverse().slice(0, count);
    try {
      return await fetchRecentlyAdded(count);
    } catch {
      return [];
    }
  },

  async getNewlyAddedMovies(count = 20, _forceRefresh = false): Promise<MediaItem[]> {
    if (DEMO) return MOCK_MEDIA_ITEMS.filter((i) => i.type === 'movie').slice(0, count);
    try {
      return await fetchMovies(count);
    } catch {
      return [];
    }
  },

  async getMediaById(id: string): Promise<MediaItem | null> {
    if (DEMO) return MOCK_MEDIA_ITEMS.find((m) => m.id === id) || null;
    try {
      // Never fall back to another item: an unknown id must return null so the
      // caller can show a "not found" state instead of silently playing Dune.
      return await fetchItem(id);
    } catch {
      return null;
    }
  },

  async getSeasonsForSeries(seriesId: string): Promise<Season[]> {
    if (DEMO) {
      const item = MOCK_MEDIA_ITEMS.find((m) => m.id === seriesId);
      if (item?.seasons && item.seasons.length > 0) return item.seasons;
      return [
        {
          seasonNumber: 1,
          title: 'Season 1',
          episodeCount: 3,
          episodes: [
            {
              id: `${seriesId}-s01e01`,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'Pilot Premiere',
              overview: 'The beginning of the thrilling cinema saga.',
              runtime: '45m',
              thumbnailUrl: item?.backdropUrl || '',
            },
          ],
        },
      ];
    }
    try {
      const seasons = await fetchSeasons(seriesId);
      const episodes = await fetchEpisodes(seriesId);
      return seasons.map((s) => ({
        ...s,
        episodes: episodes.filter((e) => e.seasonNumber === s.seasonNumber),
      }));
    } catch {
      return [];
    }
  },

  async search(query: string): Promise<MediaItem[]> {
    if (DEMO) {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return MOCK_MEDIA_ITEMS.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.overview.toLowerCase().includes(q) ||
          m.genres?.some((g) => g.toLowerCase().includes(q)) ||
          m.cast?.some((c) => c.toLowerCase().includes(q))
      );
    }
    try {
      return await fetchItemsBySearch(query);
    } catch {
      return [];
    }
  },
};
