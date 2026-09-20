import { SearchCategory, SearchFilters, SearchResultItem } from '@/types/search';
import { searchJellyfin, JellyfinItem } from '@/lib/api/jellyfin';
import { MediaBadge } from '@/types/cinema';

const RECENT_SEARCHES_KEY = 'dinustream_recent_searches';

export const INITIAL_SEARCH_CATALOG: SearchResultItem[] = [
  // --- MOVIES ---
  {
    id: 'dune-part-two',
    title: 'Dune: Part Two',
    type: 'movie',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'PG-13',
    runtime: '2h 46m',
    genres: ['Sci-Fi', 'Action', 'Adventure'],
    badges: ['4K UHD', 'Dolby Atmos', 'Dolby Vision', 'IMAX Enhanced'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    type: 'movie',
    overview: 'A new blade runner unearths a long-buried secret that has the potential to plunge what is left of society into chaos.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2017,
    rating: 'R',
    runtime: '2h 43m',
    genres: ['Sci-Fi', 'Mystery', 'Drama'],
    badges: ['4K UHD', 'Dolby Atmos'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: false,
  },
  {
    id: 'dc',
    title: 'DC',
    type: 'movie',
    overview: 'A high-octane cinematic journey following an undercover operative confronting syndicate powers.',
    posterUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'PG-13',
    runtime: '2h 15m',
    genres: ['Action', 'Thriller', 'Crime'],
    badges: ['Dolby Atmos', '4K UHD', 'Dolby Vision'],
    language: 'Tamil',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'kudumbasthan',
    title: 'Kudumbasthan',
    type: 'movie',
    overview: 'An emotionally captivating drama chronicling the bonds, challenges, and resilience of a close-knit household.',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'U/A',
    runtime: '2h 22m',
    genres: ['Drama', 'Family'],
    badges: ['Dolby Atmos', '4K UHD'],
    language: 'Tamil',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'good-night',
    title: 'Good Night',
    type: 'movie',
    overview: 'A charming, heartfelt tale about life, love, snoring, and the endearing quirks that bring two souls together.',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'U/A',
    runtime: '2h 18m',
    genres: ['Romance', 'Comedy', 'Drama'],
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD'],
    language: 'Tamil',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: false,
  },
  {
    id: 'vishwanath-and-sons',
    title: 'Vishwanath and Sons',
    type: 'movie',
    overview: 'A sweeping family drama centered around a legacy jeweler navigating modernization, rivalries, and brotherhood.',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'U/A',
    runtime: '2h 30m',
    genres: ['Drama', 'Family'],
    badges: ['Dolby Atmos', '4K UHD'],
    language: 'Tamil',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'interstellar',
    title: 'Interstellar',
    type: 'movie',
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2014,
    rating: 'PG-13',
    runtime: '2h 49m',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    badges: ['Dolby Atmos', 'IMAX Enhanced', '4K UHD'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: false,
  },
  {
    id: 'alien-romulus',
    title: 'Alien: Romulus',
    type: 'movie',
    overview: 'While scavenging a derelict space station, young colonizers come face to face with the most terrifying life form.',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'R',
    runtime: '1h 59m',
    genres: ['Horror', 'Sci-Fi'],
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD', 'IMAX Enhanced'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'challengers',
    title: 'Challengers',
    type: 'movie',
    overview: 'A former tennis prodigy turned coach orchestrates her husband’s comeback against his former best friend.',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'R',
    runtime: '2h 11m',
    genres: ['Drama', 'Romance', 'Sport'],
    badges: ['Dolby Atmos', '4K UHD'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },

  // --- SERIES ---
  {
    id: 'severance',
    title: 'Severance',
    type: 'series',
    overview: 'Office workers whose memories have been surgically divided between their work and personal lives uncover sinister mysteries.',
    posterUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2022,
    rating: 'TV-MA',
    runtime: '2 Seasons',
    genres: ['Drama', 'Sci-Fi', 'Mystery'],
    badges: ['4K UHD', 'Dolby Vision', 'Dolby Atmos'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: false,
  },
  {
    id: 'succession',
    title: 'Succession',
    type: 'series',
    overview: 'The Roy family is known for controlling the biggest media and entertainment company in the world.',
    posterUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'TV-MA',
    runtime: '4 Seasons',
    genres: ['Drama'],
    badges: ['4K UHD', 'Dolby Vision'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Digital Plus 5.1',
    isRecentlyAdded: false,
  },
  {
    id: 'shogun',
    title: 'Shōgun',
    type: 'series',
    overview: 'Lord Toranaga discovers secrets that could tip the scales of power against formidable enemies in feudal Japan.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'TV-MA',
    runtime: '1 Season',
    genres: ['Drama', 'History', 'Adventure'],
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD'],
    language: 'Japanese',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },
  {
    id: 'the-bear',
    title: 'The Bear',
    type: 'series',
    overview: 'A young chef from the fine dining world comes home to Chicago to run his family Italian beef sandwich shop.',
    posterUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'TV-MA',
    runtime: '3 Seasons',
    genres: ['Comedy', 'Drama'],
    badges: ['4K UHD', 'Dolby Vision'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    isRecentlyAdded: true,
  },

  // --- EPISODES ---
  {
    id: 'severance-s01e08',
    title: "What's for Dinner?",
    type: 'episode',
    overview: 'Mark, Helly, and Irving prepare for a dangerous gambit inside the severed floor.',
    posterUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2022,
    rating: 'TV-MA',
    runtime: '54m',
    genres: ['Drama', 'Sci-Fi', 'Mystery'],
    badges: ['4K UHD', 'Dolby Atmos'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    seriesId: 'severance',
    seriesTitle: 'Severance',
    seasonNumber: 1,
    episodeNumber: 8,
  },
  {
    id: 'severance-s01e09',
    title: 'The We We Are',
    type: 'episode',
    overview: 'The overtime contingency is triggered, thrusting the innies into their outie lives simultaneously.',
    posterUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2022,
    rating: 'TV-MA',
    runtime: '43m',
    genres: ['Drama', 'Sci-Fi', 'Mystery'],
    badges: ['4K UHD', 'Dolby Atmos'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    seriesId: 'severance',
    seriesTitle: 'Severance',
    seasonNumber: 1,
    episodeNumber: 9,
  },
  {
    id: 'succession-s04e03',
    title: "Connor's Wedding",
    type: 'episode',
    overview: 'An unexpected catastrophe disrupts Connor and Willa’s wedding festivities and changes the Roy dynasty forever.',
    posterUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'TV-MA',
    runtime: '62m',
    genres: ['Drama'],
    badges: ['4K UHD', 'Dolby Vision'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Digital Plus 5.1',
    seriesId: 'succession',
    seriesTitle: 'Succession',
    seasonNumber: 4,
    episodeNumber: 3,
  },
  {
    id: 'last-of-us-s01e03',
    title: 'Long, Long Time',
    type: 'episode',
    overview: 'When a stranger approaches his compound, survivalist Bill forges an unlikely and deeply moving connection.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'TV-MA',
    runtime: '75m',
    genres: ['Drama', 'Romance'],
    badges: ['4K UHD', 'Dolby Atmos'],
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    seriesId: 'the-last-of-us',
    seriesTitle: 'The Last of Us',
    seasonNumber: 1,
    episodeNumber: 3,
  },

  // --- MUSIC & SPATIAL AUDIO ---
  {
    id: 'hans-zimmer-live-prague',
    title: 'Hans Zimmer: Live in Prague',
    type: 'music',
    overview: 'Legendary composer Hans Zimmer performs his most iconic film scores live with a 72-piece orchestra and choir.',
    posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2017,
    rating: 'NR',
    runtime: '2h 18m',
    genres: ['Music', 'Concert'],
    badges: ['Dolby Atmos', 'Spatial Audio', '4K UHD'],
    artist: 'Hans Zimmer & Czech National Symphony Orchestra',
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    trackCount: 15,
    isRecentlyAdded: true,
  },
  {
    id: 'interstellar-ost-atmos',
    title: 'Interstellar: Original Motion Picture Soundtrack',
    type: 'music',
    overview: 'The cathedral pipe organ masterpiece mixed natively in Dolby Atmos discrete spatial acoustics.',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2014,
    rating: 'NR',
    runtime: '1h 12m',
    genres: ['Music', 'Sci-Fi'],
    badges: ['Dolby Atmos', 'Spatial Audio'],
    artist: 'Hans Zimmer & Temple Church Organ',
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    trackCount: 16,
    isRecentlyAdded: false,
  },
  {
    id: 'oppenheimer-soundtrack',
    title: 'Oppenheimer: Can You Hear The Music',
    type: 'music',
    overview: 'Ludwig Göransson’s polyrhythmic violin and orchestral score remastered in 7.1.4 Dolby Atmos spatial bitstream.',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'NR',
    runtime: '1h 34m',
    genres: ['Music', 'Drama'],
    badges: ['Dolby Atmos', 'Spatial Audio', '4K UHD'],
    artist: 'Ludwig Göransson',
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    trackCount: 24,
    isRecentlyAdded: true,
  },
  {
    id: 'blade-runner-2049-synth-suite',
    title: 'Blade Runner 2049: Synthesizer Suite',
    type: 'music',
    overview: 'Deep analog synthesizer sub-bass and dystopian electronic soundscapes created for Denis Villeneuve’s masterpiece.',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    releaseYear: 2017,
    rating: 'NR',
    runtime: '1h 33m',
    genres: ['Music', 'Electronic'],
    badges: ['Dolby Atmos', 'Spatial Audio'],
    artist: 'Hans Zimmer & Benjamin Wallfisch',
    language: 'English',
    resolution: '4K UHD',
    audioFormat: 'Dolby Atmos',
    trackCount: 20,
    isRecentlyAdded: false,
  },
];

class SearchService {
  private catalog: SearchResultItem[] = INITIAL_SEARCH_CATALOG;

  /**
   * Search across catalog (Movies, Series, Episodes, Music) with filters and Jellyfin integration
   */
  async search(query: string, filters: SearchFilters): Promise<SearchResultItem[]> {
    const trimmed = query.trim().toLowerCase();

    // 1. Filter local catalog
    let results = this.catalog.filter((item) => {
      // Category filter
      if (filters.category !== 'all' && item.type !== filters.category) {
        return false;
      }

      // Query match (Title, Overview, Artist, SeriesTitle, Genres)
      if (trimmed) {
        const titleMatch = item.title.toLowerCase().includes(trimmed);
        const overviewMatch = item.overview.toLowerCase().includes(trimmed);
        const genreMatch = item.genres.some((g) => g.toLowerCase().includes(trimmed));
        const artistMatch = item.artist ? item.artist.toLowerCase().includes(trimmed) : false;
        const seriesMatch = item.seriesTitle ? item.seriesTitle.toLowerCase().includes(trimmed) : false;

        if (!titleMatch && !overviewMatch && !genreMatch && !artistMatch && !seriesMatch) {
          return false;
        }
      }

      // Genre filter
      if (filters.genre !== 'all') {
        const hasGenre = item.genres.some(
          (g) => g.toLowerCase() === filters.genre.toLowerCase()
        );
        if (!hasGenre) return false;
      }

      // Year filter
      if (filters.year !== 'all') {
        if (filters.year === '2024' && item.releaseYear !== 2024) return false;
        if (filters.year === '2023' && item.releaseYear !== 2023) return false;
        if (filters.year === '2022' && item.releaseYear !== 2022) return false;
        if (filters.year === 'older' && item.releaseYear >= 2022) return false;
      }

      // Language filter
      if (filters.language !== 'all') {
        if (item.language && item.language.toLowerCase() !== filters.language.toLowerCase()) {
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

      // Recently added filter
      if (filters.recentlyAddedOnly && !item.isRecentlyAdded) {
        return false;
      }

      return true;
    });

    // 2. Query Jellyfin API if search query is provided (prepared architecture)
    if (trimmed && typeof window !== 'undefined') {
      try {
        const jellyfinItems = await searchJellyfin(trimmed);
        if (jellyfinItems && jellyfinItems.length > 0) {
          const adaptedJellyfinItems = jellyfinItems
            .map((j) => this.adaptJellyfinItem(j))
            .filter((jItem) => {
              if (filters.category !== 'all' && jItem.type !== filters.category) return false;
              // Avoid duplicates already in local catalog
              return !results.some((r) => r.id === jItem.id || r.title.toLowerCase() === jItem.title.toLowerCase());
            });

          results = [...results, ...adaptedJellyfinItems];
        }
      } catch {
        // Transparent fallback to local catalog
      }
    }

    return results;
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

    return {
      id: j.Id,
      title: j.Name,
      type,
      overview: j.Overview || 'Indexed feature on DinuStream.',
      posterUrl: j.ImageTags?.Primary
        ? `/api/jellyfin/items/${j.Id}/images/Primary`
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      releaseYear: j.ProductionYear || 2024,
      rating: j.OfficialRating || 'PG-13',
      runtime: j.RunTimeTicks ? `${Math.round(j.RunTimeTicks / 600000000)}m` : '2h',
      genres: j.Genres || ['Cinema'],
      badges: ['4K UHD', 'Dolby Atmos'] as MediaBadge[],
      resolution: '4K UHD',
      audioFormat: 'Dolby Atmos',
      seriesId: j.SeriesId,
      seriesTitle: j.SeriesName,
      seasonNumber: j.ParentIndexNumber,
      episodeNumber: j.IndexNumber,
    };
  }

  // --- RECENT SEARCHES ---

  getRecentSearches(): string[] {
    if (typeof window === 'undefined') {
      return ['Dune', 'DC', 'Hans Zimmer', 'Severance'];
    }
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return ['Dune', 'DC', 'Hans Zimmer', 'Severance'];
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
