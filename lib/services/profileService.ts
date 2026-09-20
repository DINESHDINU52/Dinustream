import { UserProfileId, ContinueWatchingItem } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { PROFILES } from '@/lib/constants';

const ACTIVE_PROFILE_KEY = 'dinustream_active_profile';
const PROFILES_DATA_KEY = 'dinustream_user_profiles_v1';
const EVENT_NAME = 'dinustream:profile-data-changed';

const DEFAULT_SETTINGS_DINU: UserPreferences = {
  autoplayNextEpisode: true,
  autoSkipIntro: true,
  autoSkipRecap: true,
  autoSkipOutro: false,
  defaultAudio: 'Dolby Atmos (TrueHD 7.1)',
  defaultSubtitles: 'English [CC]',
  playbackQuality: '4K UHD (2160p)',
  reducedMotion: false,
};

const DEFAULT_SETTINGS_KANMANI: UserPreferences = {
  autoplayNextEpisode: true,
  autoSkipIntro: true,
  autoSkipRecap: false,
  autoSkipOutro: true,
  defaultAudio: 'Dolby Digital Plus 5.1',
  defaultSubtitles: 'Off',
  playbackQuality: '1080p FHD',
  reducedMotion: false,
};

const INITIAL_DINU_CONTINUE_WATCHING: ContinueWatchingItem[] = [
  {
    id: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    overview: 'Thirty years after the events of the first film, a new blade runner unearths a long-buried secret.',
    type: 'movie',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2017,
    rating: 'R',
    runtime: '2h 43m',
    matchScore: 99,
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
    badges: ['Dolby Atmos', '4K UHD'],
    progressMinutes: 74,
    totalMinutes: 163,
    lastWatched: 'Today with Dinu',
  },
  {
    id: 'severance-s1',
    title: 'Severance',
    overview: 'Mark leads a team of office workers whose memories have been surgically divided.',
    type: 'series',
    backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2022,
    rating: 'TV-MA',
    runtime: '1 Season',
    matchScore: 97,
    genres: ['Drama', 'Sci-Fi'],
    badges: ['4K UHD', 'Dolby Vision'],
    progressMinutes: 42,
    totalMinutes: 54,
    currentSeasonNumber: 1,
    currentEpisodeNumber: 8,
    currentEpisodeTitle: "What's for Dinner?",
    lastWatched: '2 days ago',
  },
  {
    id: 'dc',
    title: 'DC',
    overview: 'A high-octane cinematic journey following an undercover operative confronting syndicate powers.',
    type: 'movie',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'PG-13',
    runtime: '2h 15m',
    matchScore: 98,
    genres: ['Action', 'Thriller'],
    badges: ['Dolby Atmos', '4K UHD', 'Dolby Vision'],
    progressMinutes: 48,
    totalMinutes: 135,
    lastWatched: '3 days ago',
  },
];

const INITIAL_KANMANI_CONTINUE_WATCHING: ContinueWatchingItem[] = [
  {
    id: 'succession',
    title: 'Succession',
    overview: 'The Roy family is known for controlling the biggest media and entertainment company in the world.',
    type: 'series',
    backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'TV-MA',
    runtime: '4 Seasons',
    matchScore: 99,
    genres: ['Drama'],
    badges: ['4K UHD', 'Dolby Vision'],
    progressMinutes: 51,
    totalMinutes: 62,
    currentSeasonNumber: 4,
    currentEpisodeNumber: 3,
    currentEpisodeTitle: "Connor's Wedding",
    lastWatched: 'Yesterday with Kanmani',
  },
  {
    id: 'kudumbasthan',
    title: 'Kudumbasthan',
    overview: 'An emotionally captivating drama chronicling the bonds and resilience of a close-knit household.',
    type: 'movie',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2024,
    rating: 'U/A',
    runtime: '2h 22m',
    matchScore: 97,
    genres: ['Drama', 'Family'],
    badges: ['Dolby Atmos', '4K UHD'],
    progressMinutes: 88,
    totalMinutes: 142,
    lastWatched: '2 days ago',
  },
  {
    id: 'good-night',
    title: 'Good Night',
    overview: 'A charming, heartfelt tale about love, snoring, and the endearing quirks that bring two souls together.',
    type: 'movie',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    releaseYear: 2023,
    rating: 'U/A',
    runtime: '2h 18m',
    matchScore: 99,
    genres: ['Romance', 'Comedy'],
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD'],
    progressMinutes: 60,
    totalMinutes: 138,
    lastWatched: '3 days ago',
  },
];

const INITIAL_DINU_HISTORY: WatchHistoryItem[] = [
  {
    id: 'hist-dinu-1',
    mediaId: 'dune-part-two',
    title: 'Dune: Part Two',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 24, // Yesterday
    progressMinutes: 166,
    totalMinutes: 166,
    completed: true,
    badges: ['Dolby Atmos', '4K UHD'],
  },
  {
    id: 'hist-dinu-2',
    mediaId: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 48,
    progressMinutes: 74,
    totalMinutes: 163,
    completed: false,
    badges: ['Dolby Atmos', '4K UHD'],
  },
  {
    id: 'hist-dinu-3',
    mediaId: 'alien-romulus',
    title: 'Alien: Romulus',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 96,
    progressMinutes: 119,
    totalMinutes: 119,
    completed: true,
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD'],
  },
];

const INITIAL_KANMANI_HISTORY: WatchHistoryItem[] = [
  {
    id: 'hist-kanmani-1',
    mediaId: 'challengers',
    title: 'Challengers',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 20,
    progressMinutes: 131,
    totalMinutes: 131,
    completed: true,
    badges: ['Dolby Atmos', '4K UHD'],
  },
  {
    id: 'hist-kanmani-2',
    mediaId: 'the-bear',
    title: 'The Bear',
    posterUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 44,
    progressMinutes: 32,
    totalMinutes: 32,
    completed: true,
    badges: ['4K UHD', 'Dolby Vision'],
  },
  {
    id: 'hist-kanmani-3',
    mediaId: 'kudumbasthan',
    title: 'Kudumbasthan',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    watchedAt: Date.now() - 1000 * 60 * 60 * 70,
    progressMinutes: 88,
    totalMinutes: 142,
    completed: false,
    badges: ['Dolby Atmos', '4K UHD'],
  },
];

function getInitialStore(): Record<UserProfileId, UserProfileData> {
  return {
    dinu: {
      profile: PROFILES.dinu,
      continueWatching: [...INITIAL_DINU_CONTINUE_WATCHING],
      myList: ['dc', 'blade-runner-2049', 'dune-part-two', 'interstellar'],
      watchHistory: [...INITIAL_DINU_HISTORY],
      settings: { ...DEFAULT_SETTINGS_DINU },
    },
    kanmani: {
      profile: PROFILES.kanmani,
      continueWatching: [...INITIAL_KANMANI_CONTINUE_WATCHING],
      myList: ['kudumbasthan', 'good-night', 'vishwanath-and-sons', 'challengers', 'the-bear'],
      watchHistory: [...INITIAL_KANMANI_HISTORY],
      settings: { ...DEFAULT_SETTINGS_KANMANI },
    },
  };
}

class ProfileService {
  private store: Record<UserProfileId, UserProfileData>;
  private activeId: UserProfileId = 'dinu';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.store = getInitialStore();

    if (typeof window !== 'undefined') {
      // 1. Load active profile ID
      const storedActive = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (storedActive === 'kanmani' || storedActive === 'dinu') {
        this.activeId = storedActive;
      }

      // 2. Load profiles data store
      const rawStore = localStorage.getItem(PROFILES_DATA_KEY);
      if (rawStore) {
        try {
          const parsed = JSON.parse(rawStore);
          if (parsed?.dinu && parsed?.kanmani) {
            this.store = {
              dinu: {
                ...getInitialStore().dinu,
                ...parsed.dinu,
                settings: { ...DEFAULT_SETTINGS_DINU, ...(parsed.dinu.settings || {}) },
              },
              kanmani: {
                ...getInitialStore().kanmani,
                ...parsed.kanmani,
                settings: { ...DEFAULT_SETTINGS_KANMANI, ...(parsed.kanmani.settings || {}) },
              },
            };
          }
        } catch {
          this.store = getInitialStore();
          this.save();
        }
      } else {
        this.save();
      }

      // Apply reduced motion to HTML element if active
      this.applyReducedMotion(this.store[this.activeId].settings.reducedMotion);

      // Listen to cross-window storage events
      window.addEventListener('storage', (e) => {
        if (e.key === PROFILES_DATA_KEY && e.newValue) {
          try {
            this.store = JSON.parse(e.newValue);
            this.notify();
          } catch {
            // ignore
          }
        }
        if (e.key === ACTIVE_PROFILE_KEY && e.newValue) {
          if (e.newValue === 'dinu' || e.newValue === 'kanmani') {
            this.activeId = e.newValue;
            this.notify();
          }
        }
      });
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILES_DATA_KEY, JSON.stringify(this.store));
        localStorage.setItem(ACTIVE_PROFILE_KEY, this.activeId);
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { activeId: this.activeId } }));
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private applyReducedMotion(enabled: boolean) {
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getActiveProfileId(): UserProfileId {
    return this.activeId;
  }

  getActiveProfileData(): UserProfileData {
    return this.store[this.activeId];
  }

  getProfileData(id: UserProfileId): UserProfileData {
    return this.store[id];
  }

  switchProfile(newId: UserProfileId) {
    this.activeId = newId;
    this.applyReducedMotion(this.store[newId].settings.reducedMotion);
    this.save();
  }

  updateSettings(id: UserProfileId, partial: Partial<UserPreferences>) {
    this.store[id].settings = {
      ...this.store[id].settings,
      ...partial,
    };
    if (id === this.activeId && typeof partial.reducedMotion !== 'undefined') {
      this.applyReducedMotion(partial.reducedMotion);
    }
    this.save();
  }

  toggleMyList(id: UserProfileId, mediaId: string): boolean {
    const list = this.store[id].myList;
    const exists = list.includes(mediaId);
    if (exists) {
      this.store[id].myList = list.filter((m) => m !== mediaId);
    } else {
      this.store[id].myList = [mediaId, ...list];
    }
    this.save();
    return !exists;
  }

  addToMyList(id: UserProfileId, mediaId: string) {
    if (!this.store[id].myList.includes(mediaId)) {
      this.store[id].myList = [mediaId, ...this.store[id].myList];
      this.save();
    }
  }

  removeFromMyList(id: UserProfileId, mediaId: string) {
    this.store[id].myList = this.store[id].myList.filter((m) => m !== mediaId);
    this.save();
  }

  updateContinueWatching(id: UserProfileId, item: ContinueWatchingItem) {
    const list = this.store[id].continueWatching.filter((m) => m.id !== item.id);
    this.store[id].continueWatching = [item, ...list];
    this.save();
  }

  removeFromContinueWatching(id: UserProfileId, mediaId: string) {
    this.store[id].continueWatching = this.store[id].continueWatching.filter((m) => m.id !== mediaId);
    this.save();
  }

  addWatchHistory(id: UserProfileId, item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) {
    const newEntry: WatchHistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      watchedAt: Date.now(),
    };
    // Keep last 30 items
    this.store[id].watchHistory = [newEntry, ...this.store[id].watchHistory].slice(0, 30);
    this.save();
  }

  clearWatchHistory(id: UserProfileId) {
    this.store[id].watchHistory = [];
    this.save();
  }

  resetProfileDefaults(id: UserProfileId) {
    const defaults = getInitialStore();
    this.store[id] = defaults[id];
    this.save();
  }
}

export const profileService = new ProfileService();
