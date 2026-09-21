import { UserProfileId, MediaItem } from '@/types/cinema';
import { WatchGroup, QueuedMovie } from '@/types/watchTogether';
import { getSyncStatus, syncMovie } from '@/lib/api/syncManager';
import { createSyncPlayGroup } from '@/lib/api/syncPlay';
import { PROFILES } from '@/lib/constants';
import { firestore } from '@/lib/firebase/config';
import { doc, setDoc, onSnapshot, getDoc, Unsubscribe } from 'firebase/firestore';

const STORAGE_KEY = 'dinustream_active_watch_group';
const EVENT_KEY = 'dinustream_watch_group_update';

export const INITIAL_WATCH_QUEUE: QueuedMovie[] = [];

function getInitialGroup(): WatchGroup {
  return {
    id: 'group-movie-night',
    name: 'Movie Night ❤️',
    state: 'CREATED',
    hostId: 'dinu',
    participants: [
      {
        id: 'dinu',
        name: 'Dinu',
        avatarUrl: '/avatars/dinu.svg',
        isHost: true,
        isOnline: true,
        isReady: true,
        playbackPositionSeconds: 0,
        syncLatencyMs: 12,
        statusText: 'Host • Ready in Cinema Suite',
      },
      {
        id: 'kanmani',
        name: 'Kanmani',
        avatarUrl: '/avatars/kanmani.svg',
        isHost: false,
        isOnline: false,
        isReady: false,
        playbackPositionSeconds: 0,
        syncLatencyMs: 18,
        statusText: 'Connected',
      },
    ],
    selectedMovie: null,
    queue: [],
    syncProgress: {
      state: 'ready',
      percent: 100,
      transferredBytes: 42949672960,
      totalBytes: 42949672960,
      speed: '120 MB/s',
      eta: '0s',
      currentStep: 'Oracle SSD',
    },
    currentPositionSeconds: 0,
    isPlaying: false,
    createdAt: new Date().toISOString(),
    jellyfinSyncPlayGroupId: 'syncplay-movie-night',
  };
}

class WatchTogetherService {
  private group: WatchGroup | null = null;
  private listeners: Set<(group: WatchGroup | null) => void> = new Set();
  private syncPollInterval: NodeJS.Timeout | null = null;
  private firestoreUnsub: Unsubscribe | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.group = JSON.parse(stored);
        } catch {
          this.group = getInitialGroup();
        }
      } else {
        this.group = getInitialGroup();
        this.save();
      }

      if (this.group?.id) {
        this.subscribeToFirestoreRoom(this.group.id);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.group = JSON.parse(e.newValue);
            this.notify();
          } catch {}
        }
      });
    }
  }

  private subscribeToFirestoreRoom(roomId: string) {
    if (!firestore || typeof window === 'undefined') return;
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }

    try {
      const docRef = doc(firestore, 'dinustream_watch_groups', roomId);
      this.firestoreUnsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const cloudGroup = snap.data() as WatchGroup;
          if (cloudGroup && cloudGroup.id === roomId) {
            this.group = cloudGroup;
            this.saveLocal();
            this.notify();
          }
        }
      });
    } catch (err) {
      console.warn('[WatchTogether] Firestore room subscribe error:', err);
    }
  }

  private saveLocal() {
    if (typeof window !== 'undefined') {
      try {
        if (this.group) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.group));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: this.group }));
      } catch {}
    }
  }

  private save(syncToCloud: boolean = true) {
    this.saveLocal();

    if (syncToCloud && firestore && this.group) {
      try {
        const docRef = doc(firestore, 'dinustream_watch_groups', this.group.id);
        setDoc(docRef, this.group, { merge: true }).catch(() => {});
      } catch {}
    }

    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.group));
  }

  subscribe(callback: (group: WatchGroup | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.group);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getGroup(): WatchGroup | null {
    return this.group;
  }

  async createGroup(name: string, hostId: UserProfileId): Promise<WatchGroup> {
    const syncPlay = await createSyncPlayGroup(name).catch(() => ({ GroupId: `sync-${Date.now()}` }));
    const groupId = `group-${Date.now()}`;

    const hostProfile = PROFILES[hostId] || {
      id: hostId,
      name: hostId,
      avatarUrl: '/avatars/guest.svg',
    };

    const newGroup: WatchGroup = {
      id: groupId,
      name,
      hostId,
      state: 'CREATED',
      createdAt: new Date().toISOString(),
      jellyfinSyncPlayGroupId: syncPlay.GroupId,
      participants: [
        {
          id: hostId,
          name: hostProfile.name || String(hostId),
          avatarUrl: hostProfile.avatarUrl || '/avatars/guest.svg',
          isHost: true,
          isOnline: true,
          isReady: true,
          playbackPositionSeconds: 0,
          syncLatencyMs: 14,
          statusText: 'Host • Screening Room',
        },
      ],
      selectedMovie: null,
      queue: [],
      syncProgress: {
        state: 'ready',
        percent: 100,
        transferredBytes: 42949672960,
        totalBytes: 42949672960,
        speed: '120 MB/s',
        eta: '0s',
        currentStep: 'Oracle SSD',
      },
      currentPositionSeconds: 0,
      isPlaying: false,
    };

    this.group = newGroup;
    this.save();
    this.subscribeToFirestoreRoom(groupId);
    return newGroup;
  }

  joinGroup(participantId: UserProfileId) {
    if (!this.group) return;
    const existing = this.group.participants.find((p) => p.id === participantId);
    if (!existing) {
      const pProfile = PROFILES[participantId] || {
        id: participantId,
        name: participantId,
        avatarUrl: '/avatars/guest.svg',
      };
      this.group.participants.push({
        id: participantId,
        name: pProfile.name || String(participantId),
        avatarUrl: pProfile.avatarUrl || '/avatars/guest.svg',
        isHost: false,
        isOnline: true,
        isReady: false,
        playbackPositionSeconds: 0,
        syncLatencyMs: 16,
        statusText: 'Connected',
      });
      this.save();
    }
  }

  selectMovie(movie: MediaItem) {
    if (!this.group) return;
    this.group.selectedMovie = movie;
    this.group.state = 'WAITING';
    this.save();
  }

  addToQueue(movie: MediaItem, addedBy: UserProfileId) {
    if (!this.group) return;
    const newQueueItem: QueuedMovie = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      movieId: movie.id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      runtime: movie.runtime,
      addedBy,
      addedByName: PROFILES[addedBy]?.name || String(addedBy),
      badges: movie.badges || ['4K UHD', 'Dolby Atmos'],
      addedAt: Date.now(),
    };
    this.group.queue = [...this.group.queue, newQueueItem];
    if (!this.group.selectedMovie) {
      this.group.selectedMovie = movie;
    }
    this.save();
  }

  removeFromQueue(queueId: string) {
    if (!this.group) return;
    this.group.queue = this.group.queue.filter((item) => item.id !== queueId);
    this.save();
  }

  reorderQueue(fromIndex: number, toIndex: number) {
    if (!this.group) return;
    const updated = [...this.group.queue];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    this.group.queue = updated;
    this.save();
  }

  clearQueue() {
    if (!this.group) return;
    this.group.queue = [];
    this.save();
  }

  playNext(onLaunch?: (movieId: string, groupId: string) => void) {
    if (!this.group || this.group.queue.length === 0) return;
    const nextItem = this.group.queue[0];
    this.group.queue = this.group.queue.slice(1);

    const foundMovie: MediaItem = {
      id: nextItem.movieId,
      title: nextItem.title,
      overview: 'Synchronized cinema feature.',
      type: 'movie',
      backdropUrl: nextItem.backdropUrl || nextItem.posterUrl,
      posterUrl: nextItem.posterUrl,
      releaseYear: 2024,
      rating: 'U/A',
      runtime: nextItem.runtime,
      genres: ['Cinema'],
      badges: ['4K UHD', 'Dolby Atmos'],
    };

    this.group.selectedMovie = foundMovie;
    this.save();

    if (onLaunch) {
      onLaunch(foundMovie.id, this.group.id);
    }
  }

  toggleParticipantReady(participantId: UserProfileId) {
    if (!this.group) return;
    this.group.participants = this.group.participants.map((p) => {
      if (p.id === participantId) {
        return {
          ...p,
          isReady: !p.isReady,
          statusText: !p.isReady ? 'Ready to Watch' : 'Preparing',
        };
      }
      return p;
    });
    this.save();
  }

  async startSyncAndPlay(onReadyToLaunch: (movieId: string, groupId: string) => void) {
    if (!this.group || !this.group.selectedMovie) return;
    const movie = this.group.selectedMovie;
    const filename = `${movie.id}.mkv`;

    // 1. Mark ready and launch
    this.group.syncProgress = {
      state: 'ready',
      percent: 100,
      speed: '120 MB/s',
      eta: '0s',
      currentStep: 'Oracle SSD',
    };
    this.group.state = 'PLAYING';
    this.save();

    onReadyToLaunch(movie.id, this.group.id);
  }

  
  prepareNextQueuedMovie(): QueuedMovie | null {
    if (!this.group || this.group.queue.length === 0) return null;
    const nextItem = this.group.queue[0];
    this.group.queue = this.group.queue.slice(1);

    const foundMovie: MediaItem = {
      id: nextItem.movieId,
      title: nextItem.title,
      overview: 'Synchronized cinema feature.',
      type: 'movie',
      backdropUrl: nextItem.backdropUrl || nextItem.posterUrl,
      posterUrl: nextItem.posterUrl,
      releaseYear: 2024,
      rating: 'U/A',
      runtime: nextItem.runtime,
      genres: ['Cinema'],
      badges: ['4K UHD', 'Dolby Atmos'],
    };

    this.group.selectedMovie = foundMovie;
    this.group.state = 'READY';
    this.save();
    return nextItem;
  }

  switchHost(newHostId: UserProfileId) {
    if (!this.group) return;
    this.group.hostId = newHostId;
    this.group.participants = this.group.participants.map((p) => ({
      ...p,
      isHost: p.id === newHostId,
      statusText: p.id === newHostId ? 'Host • Screening Room' : 'Connected',
    }));
    this.save();
  }

  updatePlaybackState(position: number, isPlaying: boolean) {
    if (!this.group) return;
    this.group.currentPositionSeconds = position;
    this.group.isPlaying = isPlaying;
    this.group.state = isPlaying ? 'PLAYING' : 'PAUSED';
    this.save();
  }

  resetGroup() {
    if (this.syncPollInterval) {
      clearInterval(this.syncPollInterval);
      this.syncPollInterval = null;
    }
    this.group = getInitialGroup();
    this.save();
  }
}

export const watchTogetherService = new WatchTogetherService();
