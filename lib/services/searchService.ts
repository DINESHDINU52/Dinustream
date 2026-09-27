import { SearchFilters, SearchResultItem } from '@/types/search';
import { MOCK_MEDIA_ITEMS } from '@/lib/mock-data';
import { searchHints } from '@/lib/jellyfin/queries';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
const RECENT_KEY = 'dinustream_recent_searches';

let recentSearchesStore: string[] = [];

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function persistRecent(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export const searchService = {
  getRecentSearches(): string[] {
    return recentSearchesStore.length ? recentSearchesStore : loadRecent();
  },

  addRecentSearch(term: string): void {
    if (!term.trim()) return;
    recentSearchesStore = [term, ...recentSearchesStore.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 10);
    persistRecent(recentSearchesStore);
  },

  removeRecentSearch(term: string): void {
    recentSearchesStore = recentSearchesStore.filter((s) => s !== term);
    persistRecent(recentSearchesStore);
  },

  clearRecentSearches(): void {
    recentSearchesStore = [];
    persistRecent([]);
  },

  async search(query: string, filters?: SearchFilters): Promise<SearchResultItem[]> {
    if (DEMO) {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return MOCK_MEDIA_ITEMS.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.overview.toLowerCase().includes(q) ||
          m.genres?.some((g) => g.toLowerCase().includes(q)) ||
          m.cast?.some((c) => c.toLowerCase().includes(q))
      ).map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        releaseYear: m.releaseYear || 2024,
        runtime: m.runtime || '',
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        genres: m.genres,
        badges: m.badges,
        overview: m.overview,
      }));
    }

    try {
      const results = await searchHints(query);
      // Hint results carry little metadata; filter by category when requested.
      const category = filters?.category;
      if (category && category !== 'all') {
        return results.filter((r) => r.type === category);
      }
      return results;
    } catch {
      return [];
    }
  },
};
