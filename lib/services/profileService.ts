import { UserProfileId, ContinueWatchingItem, UserProfile } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { PROFILES } from '@/lib/constants';
import { presenceService } from './presenceService';
import { firestore } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ACTIVE_PROFILE_KEY = 'dinustream_active_profile';
const PROFILES_DATA_KEY = 'dinustream_user_profiles_v1';
const GUEST_PROFILES_KEY = 'dinustream_guest_profiles_v1';
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

const DEFAULT_SETTINGS_GUEST: UserPreferences = {
  autoplayNextEpisode: true,
  autoSkipIntro: true,
  autoSkipRecap: true,
  autoSkipOutro: true,
  defaultAudio: 'Dolby Digital Plus 5.1',
  defaultSubtitles: 'Off',
  playbackQuality: '1080p FHD',
  reducedMotion: false,
};

function getInitialStore(): Record<string, UserProfileData> {
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
    guest: {
      profile: PROFILES.guest,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS_GUEST },
    },
  };
}

class ProfileService {
  private store: Record<string, UserProfileData>;
  private guestProfiles: Record<string, UserProfile> = {};
  private activeId: string = 'dinu';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.store = getInitialStore();

    if (typeof window !== 'undefined') {
      // 1. Load active profile ID
      const storedActive = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (storedActive) {
        this.activeId = storedActive;
      }

      // 2. Load custom guest profiles
      const storedGuests = localStorage.getItem(GUEST_PROFILES_KEY);
      if (storedGuests) {
        try {
          this.guestProfiles = JSON.parse(storedGuests);
        } catch {
          this.guestProfiles = {};
        }
      }

      // 3. Load profiles data store
      const rawStore = localStorage.getItem(PROFILES_DATA_KEY);
      if (rawStore) {
        try {
          const parsed = JSON.parse(rawStore);
          this.store = {
            ...getInitialStore(),
            ...parsed,
          };
        } catch {
          this.store = getInitialStore();
          this.save();
        }
      } else {
        this.save();
      }

      // Ensure active profile entry exists
      if (!this.store[this.activeId]) {
        this.store[this.activeId] = {
          profile: this.guestProfiles[this.activeId] || PROFILES[this.activeId] || {
            id: this.activeId,
            name: this.activeId,
            title: 'Cinema Guest',
            avatarUrl: '/avatars/guest.svg',
            accentColor: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.35)',
            favoriteGenre: 'Cinema Hits',
            isOnline: true,
            isGuest: true,
            pinProtected: false,
          },
          continueWatching: [],
          myList: [],
          watchHistory: [],
          settings: { ...DEFAULT_SETTINGS_GUEST },
        };
      }

      // Apply reduced motion
      if (this.store[this.activeId]?.settings?.reducedMotion) {
        this.applyReducedMotion(true);
      }

      // Start presence heartbeat for active profile
      presenceService.startHeartbeat(this.activeId);

      // Async fetch profile data from Firestore if available
      this.syncFromFirestore(this.activeId);

      // Cross-window storage events
      window.addEventListener('storage', (e) => {
        if (e.key === PROFILES_DATA_KEY && e.newValue) {
          try {
            this.store = { ...this.store, ...JSON.parse(e.newValue) };
            this.notify();
          } catch {}
        }
        if (e.key === GUEST_PROFILES_KEY && e.newValue) {
          try {
            this.guestProfiles = JSON.parse(e.newValue);
            this.notify();
          } catch {}
        }
        if (e.key === ACTIVE_PROFILE_KEY && e.newValue) {
          this.activeId = e.newValue;
          presenceService.startHeartbeat(this.activeId);
          this.notify();
        }
      });
    }
  }

  private async syncFromFirestore(profileId: string) {
    if (!firestore || typeof window === 'undefined') return;
    try {
      const docRef = doc(firestore, 'dinustream_profiles', profileId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cloudData = snap.data();
        if (cloudData && this.store[profileId]) {
          this.store[profileId] = {
            ...this.store[profileId],
            continueWatching: cloudData.continueWatching || this.store[profileId].continueWatching,
            myList: cloudData.myList || this.store[profileId].myList,
            watchHistory: cloudData.watchHistory || this.store[profileId].watchHistory,
            settings: { ...this.store[profileId].settings, ...(cloudData.settings || {}) },
          };
          this.save(false); // save local without triggering cloud loop
        }
      }
    } catch (err) {
      console.warn('[ProfileService] Firestore sync error:', err);
    }
  }

  private save(syncToCloud: boolean = true) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILES_DATA_KEY, JSON.stringify(this.store));
        localStorage.setItem(GUEST_PROFILES_KEY, JSON.stringify(this.guestProfiles));
        localStorage.setItem(ACTIVE_PROFILE_KEY, this.activeId);
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { activeId: this.activeId } }));
      } catch {}

      if (syncToCloud && firestore) {
        try {
          const docRef = doc(firestore, 'dinustream_profiles', this.activeId);
          const activeData = this.store[this.activeId];
          if (activeData) {
            setDoc(
              docRef,
              {
                continueWatching: activeData.continueWatching,
                myList: activeData.myList,
                watchHistory: activeData.watchHistory,
                settings: activeData.settings,
                lastUpdated: Date.now(),
              },
              { merge: true }
            ).catch(() => {});
          }
        } catch {}
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

  getActiveProfileId(): string {
    return this.activeId;
  }

  getAllProfiles(): UserProfile[] {
    const list: UserProfile[] = [
      PROFILES.dinu,
      PROFILES.kanmani,
      PROFILES.guest,
    ];
    Object.values(this.guestProfiles).forEach((guest) => {
      list.push(guest);
    });
    return list;
  }

  addGuestProfile(name?: string, avatarUrl?: string): UserProfile {
    const count = Object.keys(this.guestProfiles).length + 2; // Guest 1 is default, next is Guest 2
    const id = `guest_${Date.now().toString(36)}`;
    const guestName = name && name.trim() ? name.trim() : `Guest ${count}`;

    const newGuest: UserProfile = {
      id,
      name: guestName,
      title: 'Cinema Guest',
      avatarUrl: avatarUrl || '/avatars/guest.svg',
      accentColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)',
      favoriteGenre: 'Blockbusters & Cinema Hits',
      isOnline: false,
      statusMessage: 'Visiting private cinema',
      isGuest: true,
      pinProtected: false,
    };

    this.guestProfiles[id] = newGuest;
    this.store[id] = {
      profile: newGuest,
      continueWatching: [],
      myList: [],
      watchHistory: [],
      settings: { ...DEFAULT_SETTINGS_GUEST },
    };

    this.save();
    return newGuest;
  }

  removeGuestProfile(id: string) {
    if (this.guestProfiles[id]) {
      delete this.guestProfiles[id];
      delete this.store[id];
      if (this.activeId === id) {
        this.activeId = 'dinu';
      }
      this.save();
    }
  }

  getActiveProfileData(): UserProfileData {
    if (!this.store[this.activeId]) {
      return getInitialStore().dinu;
    }
    return this.store[this.activeId];
  }

  getProfileData(id: string): UserProfileData {
    return this.store[id] || getInitialStore().dinu;
  }

  switchProfile(newId: string) {
    // Only called upon authenticating through the login page
    this.activeId = newId;
    if (!this.store[newId]) {
      const p = this.guestProfiles[newId] || PROFILES[newId] || {
        id: newId,
        name: newId,
        title: 'Cinema Guest',
        avatarUrl: '/avatars/guest.svg',
        accentColor: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.35)',
        favoriteGenre: 'Cinema Hits',
        isOnline: true,
        isGuest: true,
        pinProtected: false,
      };
      this.store[newId] = {
        profile: p,
        continueWatching: [],
        myList: [],
        watchHistory: [],
        settings: { ...DEFAULT_SETTINGS_GUEST },
      };
    }

    presenceService.startHeartbeat(newId);
    this.applyReducedMotion(this.store[newId].settings?.reducedMotion || false);
    this.save();
    this.syncFromFirestore(newId);
  }

  updateSettings(id: string, partial: Partial<UserPreferences>) {
    if (!this.store[id]) return;
    this.store[id].settings = {
      ...this.store[id].settings,
      ...partial,
    };
    if (id === this.activeId && typeof partial.reducedMotion !== 'undefined') {
      this.applyReducedMotion(partial.reducedMotion);
    }
    this.save();
  }

  toggleMyList(id: string, mediaId: string): boolean {
    if (!this.store[id]) return false;
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

  addToMyList(id: string, mediaId: string) {
    if (!this.store[id]) return;
    if (!this.store[id].myList.includes(mediaId)) {
      this.store[id].myList = [mediaId, ...this.store[id].myList];
      this.save();
    }
  }

  removeFromMyList(id: string, mediaId: string) {
    if (!this.store[id]) return;
    this.store[id].myList = this.store[id].myList.filter((m) => m !== mediaId);
    this.save();
  }

  updateContinueWatching(id: string, item: ContinueWatchingItem) {
    if (!this.store[id]) return;
    const list = this.store[id].continueWatching.filter((m) => m.id !== item.id);
    this.store[id].continueWatching = [item, ...list];
    this.save();
  }

  removeFromContinueWatching(id: string, mediaId: string) {
    if (!this.store[id]) return;
    this.store[id].continueWatching = this.store[id].continueWatching.filter((m) => m.id !== mediaId);
    this.save();
  }

  addWatchHistory(id: string, item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) {
    if (!this.store[id]) return;
    const newEntry: WatchHistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      watchedAt: Date.now(),
    };
    this.store[id].watchHistory = [newEntry, ...this.store[id].watchHistory].slice(0, 30);
    this.save();
  }

  clearWatchHistory(id: string) {
    if (!this.store[id]) return;
    this.store[id].watchHistory = [];
    this.save();
  }

  resetProfileDefaults(id: string) {
    const defaults = getInitialStore();
    if (defaults[id]) {
      this.store[id] = defaults[id];
      this.save();
    }
  }
}

export const profileService = new ProfileService();
