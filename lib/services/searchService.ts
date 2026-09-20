import { SearchCategory, SearchFilters, SearchResultItem } from '@/types/search';
import { searchJellyfin, getMovies, getSeries, JellyfinItem } from '@/lib/api/jellyfin';
import { MediaBadge } from '@/types/cinema';

const RECENT_SEARCHES_KEY = 'dinustream_recent_searches';

class SearchService {
  /**
   * Search Jellyfin catalog with full filter support
   */
  async search(query: string, filters: SearchFilters): Promise<SearchResultItem[]> {
    const trimmed = query.trim();

    try {
      let jellyfinItems: JellyfinItem[] = [];

      if (trimmed) {
        // Query Jellyfin with the user query
        jellyfinItems = await searchJellyfin(trimmed, 'Movie,Series,Episode');
      } else {
        // Empty query: fetch popular / default items from Jellyfin
        const [moviesRes, seriesRes] = await Promise.all([
          getMovies(25).catch(() => ({ Items: [] })),
          getSeries(15).catch(() => ({ Items: [] })),
        ]);
        jellyfinItems = [...(moviesRes?.Items || []), ...(seriesRes?.Items || [])];
      }

      // Adapt into SearchResultItem
      let results = jellyfinItems.map((j) => this.adaptJellyfinItem(j));

      // Apply client-side filters
      results = results.filter((item) => {
        // Category filter
        if (filters.category !== 'all' && item.type !== filters.category) {
          return false;
        }

        // Genre filter
        if (filters.genre !== 'all') {
          if (!item.genres.some((g) => g.toLowerCase() === filters.genre.toLowerCase())) {
            return false;
          }
        }

        // Resolution filter
        if (filters.resolution !== 'all') {
          if (item.resolution && item.resolution !== filters.resolution) {
            return false;
          }
        }

        // Audio format filter
        if (filters.audio !== 'all') {
          if (item.audioFormat && !item.audioFormat.toLowerCase().includes(filters.audio.toLowerCase())) {
            return false;
          }
        }

        return true;
      });

      return results;
    } catch (err) {
      console.error('[SearchService] search error:', err);
      return [];
    }
  }

  private adaptJellyfinItem(j: JellyfinItem): SearchResultItem {
    const type: 'movie' | 'series' | 'episode' | 'music' =
      j.Type === 'Movie'
        ? 'movie'
        : j.Type === 'Series'
        ? 'series'
        : j.Type === 'Episode'
        ? 'episode'
        : 'music';

    const badges: MediaBadge[] = [];
    const video = j.MediaStreams?.find((s) => s.Type === 'Video');
    let resolution: '4K UHD' | '1080p FHD' | '720p HD' = '1080p FHD';
    if (
      (video?.Height && video.Height >= 2160) ||
      (video?.Width && video.Width >= 3840) ||
      video?.DisplayTitle?.includes('4K')
    ) {
      badges.push('4K UHD');
      resolution = '4K UHD';
    }

    if (
      video?.DisplayTitle?.toLowerCase().includes('hdr') ||
      video?.DisplayTitle?.toLowerCase().includes('dolby vision')
    ) {
      badges.push('Dolby Vision');
    }

    const hasAtmos = j.MediaStreams?.some(
      (s) =>
        s.Type === 'Audio' &&
        (s.DisplayTitle?.toLowerCase().includes('atmos') || s.Codec?.toLowerCase() === 'truehd')
    );
    let audioFormat: 'Dolby Atmos' | 'Dolby Digital Plus 5.1' | 'Spatial Audio' | 'Stereo' = 'Stereo';
    if (hasAtmos) {
      badges.push('Dolby Atmos');
      audioFormat = 'Dolby Atmos';
    } else if (j.MediaStreams?.some((s) => s.Type === 'Audio' && s.Codec?.includes('eac3'))) {
      audioFormat = 'Dolby Digital Plus 5.1';
    }

    const posterUrl = `/api/jellyfin/items/${encodeURIComponent(j.Id)}/Images/Primary`;
    const backdropUrl = j.BackdropImageTags && j.BackdropImageTags.length > 0
      ? `/api/jellyfin/items/${encodeURIComponent(j.Id)}/Images/Backdrop`
      : posterUrl;

    return {
      id: j.Id,
      title: j.Name,
      type,
      overview: j.Overview || 'Masterfully calibrated private presentation for Dinu & Kanmani.',
      posterUrl,
      backdropUrl,
      releaseYear: j.ProductionYear || new Date().getFullYear(),
      rating: j.CommunityRating ? `${j.CommunityRating.toFixed(1)}/10` : 'NR',
      runtime: j.RunTimeTicks ? `${Math.round(j.RunTimeTicks / 600000000)}m` : '2h',
      genres: j.Genres || [],
      badges,
      resolution,
      audioFormat,
      seriesId: j.SeriesId,
      seriesTitle: j.SeriesName,
      seasonNumber: j.ParentIndexNumber,
      episodeNumber: j.IndexNumber,
    };
  }

  // --- RECENT SEARCHES ---

  getRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  addRecentSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed || typeof window === 'undefined') return;

    try {
      const current = this.getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...current].slice(0, 8);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  removeRecentSearch(query: string) {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getRecentSearches().filter((q) => q !== query);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }

  clearRecentSearches() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  }
}

export const searchService = new SearchService();
