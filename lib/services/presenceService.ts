import { firestore } from '@/lib/firebase/config';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

export interface ProfilePresence {
  profileId: string;
  status: 'online' | 'offline';
  lastSeen: number;
}

/** Heartbeat fires every 10s; three missed beats means the tab is gone. */
export const PRESENCE_STALE_AFTER_MS = 30_000;

/**
 * Pure "is this presence record still fresh?" predicate.
 *
 * Exported so components that already hold a subscribed presence snapshot can
 * evaluate it directly instead of calling back into the singleton — which also
 * keeps the staleness window defined in exactly one place.
 */
export function isPresenceOnline(presence?: ProfilePresence | null): boolean {
  if (!presence) return false;
  return presence.status === 'online' && Date.now() - presence.lastSeen < PRESENCE_STALE_AFTER_MS;
}

class PresenceService {
  private presences: Map<string, ProfilePresence> = new Map();
  private listeners: Set<(map: Record<string, ProfilePresence>) => void> = new Set();
  private channel: BroadcastChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentActiveProfileId: string | null = null;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('dinustream_presence_channel');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'PRESENCE_UPDATE') {
            const update: ProfilePresence = event.data.payload;
            this.presences.set(update.profileId, update);
            this.notify();
          }
        };
      } catch {
        // Fallback for environments without BroadcastChannel
      }

      // Check Firestore real-time presence
      if (firestore) {
        try {
          const colRef = collection(firestore, 'dinustream_presence');
          this.unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
            snapshot.forEach((d) => {
              const data = d.data() as ProfilePresence;
              if (data && data.profileId) {
                this.presences.set(data.profileId, data);
              }
            });
            this.notify();
          });
        } catch (err) {
          console.warn('[Presence] Firestore presence listener error:', err);
        }
      }

      // Cleanup on tab close/unload
      window.addEventListener('beforeunload', () => {
        if (this.currentActiveProfileId) {
          this.markOffline(this.currentActiveProfileId);
        }
      });

      window.addEventListener('pagehide', () => {
        if (this.currentActiveProfileId) {
          this.markOffline(this.currentActiveProfileId);
        }
      });
    }
  }

  private notify() {
    const obj: Record<string, ProfilePresence> = {};
    this.presences.forEach((val, key) => {
      obj[key] = val;
    });
    this.listeners.forEach((cb) => cb(obj));
  }

  subscribe(callback: (map: Record<string, ProfilePresence>) => void): () => void {
    this.listeners.add(callback);
    // Send immediate current state
    const obj: Record<string, ProfilePresence> = {};
    this.presences.forEach((val, key) => {
      obj[key] = val;
    });
    callback(obj);
    return () => {
      this.listeners.delete(callback);
    };
  }

  startHeartbeat(profileId: string) {
    this.currentActiveProfileId = profileId;
    this.sendHeartbeat(profileId);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.currentActiveProfileId) {
        this.sendHeartbeat(this.currentActiveProfileId);
      }
    }, 10000); // Every 10 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.currentActiveProfileId) {
      this.markOffline(this.currentActiveProfileId);
      this.currentActiveProfileId = null;
    }
  }

  private sendHeartbeat(profileId: string) {
    const presence: ProfilePresence = {
      profileId,
      status: 'online',
      lastSeen: Date.now(),
    };
    this.presences.set(profileId, presence);
    this.notify();

    // Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'PRESENCE_UPDATE', payload: presence });
      } catch {}
    }

    // Save to Firestore if available
    if (firestore) {
      try {
        const docRef = doc(firestore, 'dinustream_presence', profileId);
        setDoc(docRef, presence, { merge: true }).catch(() => {});
      } catch {}
    }
  }

  markOffline(profileId: string) {
    const presence: ProfilePresence = {
      profileId,
      status: 'offline',
      lastSeen: Date.now(),
    };
    this.presences.set(profileId, presence);
    this.notify();

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'PRESENCE_UPDATE', payload: presence });
      } catch {}
    }

    if (firestore) {
      try {
        const docRef = doc(firestore, 'dinustream_presence', profileId);
        setDoc(docRef, presence, { merge: true }).catch(() => {});
      } catch {}
    }
  }

  isProfileOnline(profileId: string): boolean {
    return isPresenceOnline(this.presences.get(profileId));
  }

  getLastSeenText(profileId: string): string {
    const p = this.presences.get(profileId);
    if (!p || !p.lastSeen) return 'Offline';
    if (this.isProfileOnline(profileId)) return 'Active Now';

    const diff = Math.floor((Date.now() - p.lastSeen) / 1000);
    if (diff < 60) return 'Active just now';
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
    return 'Offline';
  }
}

export const presenceService = new PresenceService();
