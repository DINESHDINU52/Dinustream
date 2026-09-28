import { MediaItem } from '@/types/cinema';

type CacheSubscriber = (key: string, data: any) => void;
const subscribers = new Set<CacheSubscriber>();

const memoryStore = new Map<string, MediaItem[]>();
const STORAGE_PREFIX = 'dinustream:cache:';

export const mediaCache = {
  getInstantValue(key: string): MediaItem[] | null {
    if (typeof window === 'undefined') {
      return memoryStore.get(key) || null;
    }
    // Check in-memory store first
    if (memoryStore.has(key)) {
      return memoryStore.get(key) || null;
    }
    // Check sessionStorage for fast warm paint across page refreshes
    try {
      const stored = window.sessionStorage.getItem(STORAGE_PREFIX + key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryStore.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  },

  set(key: string, val: MediaItem[]): void {
    if (val && Array.isArray(val) && val.length > 0) {
      memoryStore.set(key, val);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
        } catch {
          /* storage full or private browsing */
        }
      }
    }
    subscribers.forEach((fn) => fn(key, val));
  },

  clear(): void {
    memoryStore.clear();
    if (typeof window !== 'undefined') {
      try {
        for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            window.sessionStorage.removeItem(k);
          }
        }
      } catch {
        /* ignore */
      }
    }
  },

  invalidate(): void {
    this.clear();
  },

  subscribe(callback: CacheSubscriber): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};
