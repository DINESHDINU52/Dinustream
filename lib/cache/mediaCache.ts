/**
 * DinuStream High-Performance Multi-Tier Media Cache
 *
 * Tier 1: In-Memory Map (0.001ms access time)
 * Tier 2: Browser Session/Local Storage (survives page navigation, 0ms load)
 * Strategy: Stale-While-Revalidate for instantaneous card and catalog rendering.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type CacheUpdateListener = (key: string, data: unknown) => void;

class MediaCacheManager {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private readonly storagePrefix = 'dinustream_cache_';
  private inFlightRequests = new Map<string, Promise<unknown>>();
  private listeners = new Set<CacheUpdateListener>();

  /**
   * Subscribe to cache updates (e.g. when background revalidation finishes)
   */
  subscribe(listener: CacheUpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(key: string, data: unknown): void {
    this.listeners.forEach((listener) => {
      try {
        listener(key, data);
      } catch (err) {
        console.warn(`[MediaCache] Error in cache subscriber for ${key}:`, err);
      }
    });
  }

  /**
   * Get cached data or execute fetcher with Stale-While-Revalidate
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = 2 * 60 * 1000, // 2 minutes default TTL
    forceRefresh = false
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = this.get<T>(key);

      if (cached) {
        const isStale = Date.now() - cached.timestamp > cached.ttl;
        if (isStale) {
          // Revalidate in background without blocking caller
          this.revalidateInBackground(key, fetcher, ttlMs);
        }
        return cached.data;
      }
    }

    // Deduplicate in-flight requests for the exact same key
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = fetcher()
      .then((data) => {
        if (data !== null && data !== undefined) {
          // Only cache non-empty results
          if (!Array.isArray(data) || data.length > 0) {
            this.set(key, data, ttlMs);
            this.notifyListeners(key, data);
          }
        }
        return data;
      })
      .finally(() => {
        this.inFlightRequests.delete(key);
      });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Synchronous get from memory or storage (for instant UI state hydration)
   */
  get<T>(key: string): CacheEntry<T> | null {
    // 1. Check in-memory L1 cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as CacheEntry<T>;
    }

    // 2. Check browser storage L2 cache
    if (typeof window !== 'undefined') {
      try {
        const item =
          sessionStorage.getItem(this.storagePrefix + key) ||
          localStorage.getItem(this.storagePrefix + key);
        if (item) {
          const entry = JSON.parse(item) as CacheEntry<T>;
          // Populate L1 cache for subsequent synchronous calls
          this.memoryCache.set(key, entry as CacheEntry<unknown>);
          return entry;
        }
      } catch {
        // Storage access error, gracefully ignore
      }
    }

    return null;
  }

  /**
   * Get value directly synchronously if cached
   */
  getInstantValue<T>(key: string): T | null {
    const entry = this.get<T>(key);
    return entry ? entry.data : null;
  }

  /**
   * Store data in L1 memory and L2 storage
   */
  set<T>(key: string, data: T, ttlMs = 2 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // L1 Memory
    this.memoryCache.set(key, entry as CacheEntry<unknown>);

    // L2 Storage
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(entry);
        sessionStorage.setItem(this.storagePrefix + key, serialized);
        localStorage.setItem(this.storagePrefix + key, serialized);
      } catch {
        // Quota exceeded or private browsing restrictions
      }
    }
  }

  /**
   * Revalidate key in background and broadcast fresh data to all active UI subscribers
   */
  private revalidateInBackground<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): void {
    if (this.inFlightRequests.has(key)) return;

    const promise = fetcher()
      .then((fresh) => {
        if (fresh !== null && fresh !== undefined) {
          if (!Array.isArray(fresh) || fresh.length > 0) {
            this.set(key, fresh, ttlMs);
            this.notifyListeners(key, fresh);
          }
        }
      })
      .catch((err) => {
        console.warn(`[MediaCache] Background revalidation failed for ${key}:`, err);
      })
      .finally(() => {
        this.inFlightRequests.delete(key);
      });

    this.inFlightRequests.set(key, promise);
  }

  /**
   * Invalidate entire cache or keys matching prefix
   */
  invalidate(prefix?: string): void {
    this.inFlightRequests.clear();

    if (!prefix) {
      this.memoryCache.clear();
      if (typeof window !== 'undefined') {
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith(this.storagePrefix))
            .forEach((k) => sessionStorage.removeItem(k));
          Object.keys(localStorage)
            .filter((k) => k.startsWith(this.storagePrefix))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
      }
      return;
    }

    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(prefix)) this.memoryCache.delete(k);
    }

    if (typeof window !== 'undefined') {
      try {
        const fullPrefix = this.storagePrefix + prefix;
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith(fullPrefix))
          .forEach((k) => sessionStorage.removeItem(k));
        Object.keys(localStorage)
          .filter((k) => k.startsWith(fullPrefix))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }
}

export const mediaCache = new MediaCacheManager();
