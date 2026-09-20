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

function getInitialStore(): Record<UserProfileId, UserProfileData> {
  return {
    dinu: {
      profile: PROFILES.dinu,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS_DINU },
    },
    kanmani: {
      profile: PROFILES.kanmani,
      continueWatching: [],
      myList: [],
      watchHistory: [],
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
