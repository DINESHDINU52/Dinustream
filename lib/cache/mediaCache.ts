import { MOCK_MEDIA_ITEMS } from '@/lib/mock-data';

type CacheSubscriber = (key: string, data: any) => void;
const subscribers = new Set<CacheSubscriber>();

export const mediaCache = {
  getInstantValue(key: string): any {
    if (key.includes('featured')) {
      return MOCK_MEDIA_ITEMS.slice(0, 4);
    }
    if (key.includes('series')) {
      return MOCK_MEDIA_ITEMS.filter((m) => m.type === 'series');
    }
    return MOCK_MEDIA_ITEMS.filter((m) => m.type === 'movie');
  },
  set(key: string, val: any): void {
    subscribers.forEach((fn) => fn(key, val));
  },
  clear(): void {},
  invalidate(): void {},
  subscribe(callback: CacheSubscriber): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};
