import { ContinueWatchingItem, UserProfile, UserProfileId } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { PROFILES } from '@/lib/constants';

const ACTIVE_KEY = 'dinustream_ui_active_profile';
const STORE_KEY = 'dinustream_ui_profiles_store';

const DEFAULT_SETTINGS: UserPreferences = {
  autoplayNextEpisode: true,
  autoSkipIntro: true,
  autoSkipRecap: true,
  autoSkipOutro: false,
  defaultAudio: 'Dolby Atmos (TrueHD 7.1)',
  defaultSubtitles: 'English [CC]',
  playbackQuality: '4K UHD (2160p)',
  reducedMotion: false,
};

const MOCK_IDS = new Set([
  'dune-part-two',
  'oppenheimer',
  'interstellar',
  'blade-runner-2049',
  'spider-man-across-the-spider-verse',
  'cyberpunk-edgerunners',
]);

function sanitizeProfile(data: UserProfileData): UserProfileData {
  return {
    ...data,
    continueWatching: (data.continueWatching || []).filter((item) => !MOCK_IDS.has(item.id)),
    myList: (data.myList || []).filter((id) => !MOCK_IDS.has(id)),
  };
}

function getStore(): Record<string, UserProfileData> {
  const blankStore: Record<string, UserProfileData> = {
    dinu: {
      profile: PROFILES.dinu,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    },
    kanmani: {
      profile: PROFILES.kanmani,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    },
    guest: {
      profile: PROFILES.guest,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    },
  };

  if (typeof window === 'undefined') {
    return blankStore;
  }

  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const cleaned: Record<string, UserProfileData> = {};
        for (const [k, v] of Object.entries(parsed)) {
          cleaned[k] = sanitizeProfile(v as UserProfileData);
        }
        return cleaned;
      }
    }
  } catch (e) {}

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(blankStore));
  } catch (e) {}
  return blankStore;
}

function saveStore(store: Record<string, UserProfileData>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('dinustream:profile-data-changed'));
  } catch (e) {}
}

export const profileService = {
  getActiveProfileId(): UserProfileId {
    if (typeof window === 'undefined') return 'dinu';
    return (localStorage.getItem(ACTIVE_KEY) as UserProfileId) || 'dinu';
  },

  setActiveProfile(id: UserProfileId): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_KEY, id);
      window.dispatchEvent(new Event('dinustream:profile-data-changed'));
    }
  },

  switchProfile(id: UserProfileId): void {
    this.setActiveProfile(id);
  },

  getActiveProfileData(): UserProfileData {
    const pid = this.getActiveProfileId();
    const store = getStore();
    return (
      store[pid] || {
        profile: PROFILES[pid] || PROFILES.dinu,
        continueWatching: [],
        myList: [],
        watchHistory: [],
        settings: { ...DEFAULT_SETTINGS },
      }
    );
  },

  /** Per-user settings, defaulting to the base preferences for unknown users. */
  getSettingsFor(id?: UserProfileId): UserPreferences {
    const pid = id || this.getActiveProfileId();
    const store = getStore();
    return store[pid]?.settings || { ...DEFAULT_SETTINGS };
  },

  getProfile(id?: UserProfileId): UserProfile {
    const pid = id || this.getActiveProfileId();
    const store = getStore();
    return store[pid]?.profile || PROFILES[pid] || PROFILES.dinu;
  },

  getAllProfiles(): UserProfile[] {
    const store = getStore();
    return Object.values(store).map((s) => s.profile);
  },

  createCustomProfile(
    name: string,
    avatarUrl: string,
    accentColor: string,
    pinProtected: boolean,
    glowColor?: string
  ): UserProfile {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const newProfile: UserProfile = {
      id,
      name,
      title: 'Cinema Enthusiast',
      avatarUrl,
      accentColor: accentColor || '#38bdf8',
      glowColor: glowColor || 'rgba(56, 189, 248, 0.4)',
      favoriteGenre: 'Cinema Blockbusters',
      isOnline: true,
      pinProtected,
    };
    const store = getStore();
    store[id] = {
      profile: newProfile,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    saveStore(store);
    return newProfile;
  },

  updateProfileCustom(id: string, updates: Partial<UserProfile>): void {
    const store = getStore();
    if (store[id]) {
      store[id].profile = { ...store[id].profile, ...updates };
      saveStore(store);
    }
  },

  deleteProfile(id: string): void {
    const store = getStore();
    if (store[id]) {
      delete store[id];
      saveStore(store);
    }
  },

  updateProfile(id: UserProfileId, updates: Partial<UserProfile>): void {
    const store = getStore();
    if (store[id]) {
      store[id].profile = { ...store[id].profile, ...updates };
      saveStore(store);
    }
  },

  updateProfileAvatar(id: UserProfileId, avatarUrl: string): void {
    this.updateProfile(id, { avatarUrl });
  },

  getContinueWatching(id?: UserProfileId): ContinueWatchingItem[] {
    const pid = id || this.getActiveProfileId();
    const store = getStore();
    return store[pid]?.continueWatching || [];
  },

  updateContinueWatching(id: UserProfileId, item: ContinueWatchingItem): void {
    const store = getStore();
    if (!store[id]) return;
    const existing = store[id].continueWatching.filter((c) => c.id !== item.id);
    store[id].continueWatching = [item, ...existing];
    saveStore(store);
  },

  removeFromContinueWatching(id: UserProfileId, mediaId: string): void {
    const store = getStore();
    if (!store[id]) return;
    store[id].continueWatching = store[id].continueWatching.filter((c) => c.id !== mediaId);
    saveStore(store);
  },

  getMyList(id?: UserProfileId): string[] {
    const pid = id || this.getActiveProfileId();
    const store = getStore();
    return store[pid]?.myList || [];
  },

  toggleMyList(id: UserProfileId, mediaId: string): boolean {
    const store = getStore();
    if (!store[id]) return false;
    const exists = store[id].myList.includes(mediaId);
    if (exists) {
      store[id].myList = store[id].myList.filter((m) => m !== mediaId);
    } else {
      store[id].myList.push(mediaId);
    }
    saveStore(store);
    return !exists;
  },

  addToMyList(id: UserProfileId, mediaId: string): void {
    const store = getStore();
    if (store[id] && !store[id].myList.includes(mediaId)) {
      store[id].myList.push(mediaId);
      saveStore(store);
    }
  },

  removeFromMyList(id: UserProfileId, mediaId: string): void {
    const store = getStore();
    if (store[id]) {
      store[id].myList = store[id].myList.filter((m) => m !== mediaId);
      saveStore(store);
    }
  },

  updateSettings(id: UserProfileId, updates: Partial<UserPreferences>): void {
    const store = getStore();
    if (store[id]) {
      store[id].settings = { ...store[id].settings, ...updates };
      saveStore(store);
    }
  },

  addWatchHistory(id: UserProfileId, item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>): void {
    const store = getStore();
    if (!store[id]) return;
    const historyItem: WatchHistoryItem = {
      ...item,
      id: 'history-' + Date.now(),
      watchedAt: Date.now(),
    };
    store[id].watchHistory = [historyItem, ...store[id].watchHistory.slice(0, 49)];
    saveStore(store);
  },

  clearWatchHistory(id: UserProfileId): void {
    const store = getStore();
    if (store[id]) {
      store[id].watchHistory = [];
      saveStore(store);
    }
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('dinustream:profile-data-changed', callback);
    return () => window.removeEventListener('dinustream:profile-data-changed', callback);
  },
};
