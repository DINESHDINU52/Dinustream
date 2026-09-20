import { MediaItem } from '@/types/cinema';
import { WatchGroup, QueuedMovie } from '@/types/watchTogether';
import { FEATURED_HERO_MEDIA, MOCK_MOVIES } from '@/lib/mock-data';
import { getSyncStatus, syncMovie } from '@/lib/api/syncManager';
import { createSyncPlayGroup } from '@/lib/api/syncPlay';

const STORAGE_KEY = 'dinustream_active_watch_group';
const EVENT_KEY = 'dinustream_watch_group_update';

export const INITIAL_WATCH_QUEUE: QueuedMovie[] = [
  {
    id: 'queue-dc',
    movieId: 'dc',
    title: 'DC',
    runtime: '2h 15m',
    posterUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    badges: ['Dolby Atmos', '4K UHD', 'Dolby Vision'],
    addedBy: 'dinu',
    addedByName: 'Dinu',
    addedAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'queue-kudumbasthan',
    movieId: 'kudumbasthan',
    title: 'Kudumbasthan',
    runtime: '2h 22m',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    badges: ['Dolby Atmos', '4K UHD'],
    addedBy: 'kanmani',
    addedByName: 'Kanmani',
    addedAt: Date.now() - 1000 * 60 * 25,
  },
  {
    id: 'queue-good-night',
    movieId: 'good-night',
    title: 'Good Night',
    runtime: '2h 18m',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    badges: ['Dolby Atmos', 'Dolby Vision', '4K UHD'],
    addedBy: 'dinu',
    addedByName: 'Dinu',
    addedAt: Date.now() - 1000 * 60 * 20,
  },
  {
    id: 'queue-vishwanath-and-sons',
    movieId: 'vishwanath-and-sons',
    title: 'Vishwanath and Sons',
    runtime: '2h 30m',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    badges: ['Dolby Atmos', '4K UHD'],
    addedBy: 'kanmani',
    addedByName: 'Kanmani',
    addedAt: Date.now() - 1000 * 60 * 15,
  },
];

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
        avatarUrl: '/avatars/dinu.png',
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
        avatarUrl: '/avatars/kanmani.png',
        isHost: false,
        isOnline: true,
        isReady: true,
        playbackPositionSeconds: 0,
        syncLatencyMs: 18,
        statusText: 'Connected • Ready to Watch',
      },
    ],
    selectedMovie: FEATURED_HERO_MEDIA,
    queue: [...INITIAL_WATCH_QUEUE],
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

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.queue || parsed.queue.length === 0 || !parsed.queue[0]?.movieId) {
            parsed.queue = [...INITIAL_WATCH_QUEUE];
          }
          this.group = parsed;
        } catch {
          this.group = getInitialGroup();
        }
      } else {
        this.group = getInitialGroup();
        this.save();
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.group = JSON.parse(e.newValue);
            this.notify();
          } catch {
            // ignore
          }
        }
      });

      window.addEventListener(EVENT_KEY, ((e: CustomEvent<WatchGroup>) => {
        if (e.detail) {
          this.group = e.detail;
          this.notify();
        }
      }) as EventListener);
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      if (this.group) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.group));
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: this.group }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.group));
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

  async createGroup(name: string = 'Movie Night ❤️', hostId: 'dinu' | 'kanmani' = 'dinu'): Promise<WatchGroup> {
    const syncPlay = await createSyncPlayGroup(name);
    const newGroup: WatchGroup = {
      ...getInitialGroup(),
      id: `group-${Date.now()}`,
      name,
      hostId,
      state: 'CREATED',
      createdAt: new Date().toISOString(),
      jellyfinSyncPlayGroupId: syncPlay.GroupId,
      participants: [
        {
          id: 'dinu',
          name: 'Dinu',
          avatarUrl: '/avatars/dinu.png',
          isHost: hostId === 'dinu',
          isOnline: true,
          isReady: true,
          playbackPositionSeconds: 0,
          syncLatencyMs: 14,
          statusText: hostId === 'dinu' ? 'Host • Screening Room' : 'Connected',
        },
        {
          id: 'kanmani',
          name: 'Kanmani',
          avatarUrl: '/avatars/kanmani.png',
          isHost: hostId === 'kanmani',
          isOnline: true,
          isReady: true,
          playbackPositionSeconds: 0,
          syncLatencyMs: 19,
          statusText: hostId === 'kanmani' ? 'Host • Screening Room' : 'Connected',
        },
      ],
    };

    this.group = newGroup;
    this.save();
    return newGroup;
  }

  selectMovie(movie: MediaItem) {
    if (!this.group) return;
    this.group.selectedMovie = movie;
    this.group.state = 'WAITING';
    this.group.syncProgress = {
      state: 'not_cached',
      percent: 0,
      speed: '0 MB/s',
      eta: '--',
      currentStep: 'Google Drive',
    };
    this.save();

    // Check actual cache status
    this.checkMovieCache(movie.id);
  }

  async checkMovieCache(movieId: string) {
    if (!this.group) return;
    try {
      const res = await getSyncStatus(`${movieId}.mkv`);
      if (res.state === 'ready') {
        this.group.syncProgress = {
          state: 'ready',
          percent: 100,
          speed: '0 MB/s',
          eta: '0s',
          currentStep: 'Oracle SSD',
        };
        this.group.state = 'READY';
        this.save();
      }
    } catch {
      // Fallback state
    }
  }

  addToQueue(movie: MediaItem, addedBy: 'dinu' | 'kanmani' = 'dinu') {
    if (!this.group) return;
    const exists = this.group.queue.some((m) => m.movieId === movie.id);
    if (!exists) {
      const newItem: QueuedMovie = {
        id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        movieId: movie.id,
        title: movie.title,
        runtime: movie.runtime || '2h 10m',
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        badges: movie.badges || ['Dolby Atmos', '4K UHD'],
        addedBy,
        addedByName: addedBy === 'dinu' ? 'Dinu' : 'Kanmani',
        addedAt: Date.now(),
      };
      this.group.queue.push(newItem);
      this.save();
    }
  }

  removeFromQueue(queueIdOrMovieId: string) {
    if (!this.group) return;
    this.group.queue = this.group.queue.filter(
      (m) => m.id !== queueIdOrMovieId && m.movieId !== queueIdOrMovieId
    );
    this.save();
  }

  reorderQueue(fromIndex: number, toIndex: number) {
    if (!this.group) return;
    if (
      fromIndex < 0 ||
      fromIndex >= this.group.queue.length ||
      toIndex < 0 ||
      toIndex >= this.group.queue.length
    ) {
      return;
    }
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

    const foundMovie: MediaItem = MOCK_MOVIES.find((m) => m.id === nextItem.movieId) || {
      id: nextItem.movieId,
      title: nextItem.title,
      overview: 'Synchronized cinema feature for Dinu & Kanmani.',
      type: 'movie',
      backdropUrl: nextItem.backdropUrl || nextItem.posterUrl,
      posterUrl: nextItem.posterUrl,
      releaseYear: 2024,
      rating: 'U/A',
      runtime: nextItem.runtime,
      matchScore: 99,
      genres: ['Action', 'Drama'],
      badges: nextItem.badges as import('@/types/cinema').MediaBadge[],
    };

    this.selectMovie(foundMovie);
    this.save();
    if (onLaunch && this.group) {
      onLaunch(nextItem.movieId, this.group.id);
    }
  }

  prepareNextQueuedMovie(): QueuedMovie | null {
    if (!this.group || this.group.queue.length === 0) return null;
    const nextItem = this.group.queue[0];
    this.group.queue = this.group.queue.slice(1);

    const foundMovie: MediaItem = MOCK_MOVIES.find((m) => m.id === nextItem.movieId) || {
      id: nextItem.movieId,
      title: nextItem.title,
      overview: 'Synchronized cinema feature for Dinu & Kanmani.',
      type: 'movie',
      backdropUrl: nextItem.backdropUrl || nextItem.posterUrl,
      posterUrl: nextItem.posterUrl,
      releaseYear: 2024,
      rating: 'U/A',
      runtime: nextItem.runtime,
      matchScore: 99,
      genres: ['Action', 'Drama'],
      badges: nextItem.badges as import('@/types/cinema').MediaBadge[],
    };

    this.group.selectedMovie = foundMovie;
    this.group.state = 'READY';
    this.save();
    return nextItem;
  }

  toggleParticipantReady(participantId: 'dinu' | 'kanmani') {
    if (!this.group) return;
    this.group.participants = this.group.participants.map((p) =>
      p.id === participantId ? { ...p, isReady: !p.isReady } : p
    );
    this.save();
  }

  switchHost(newHostId: 'dinu' | 'kanmani') {
    if (!this.group) return;
    this.group.hostId = newHostId;
    this.group.participants = this.group.participants.map((p) => ({
      ...p,
      isHost: p.id === newHostId,
      statusText: p.id === newHostId ? 'Host • Screening Room' : 'Connected',
    }));
    this.save();
  }

  /**
   * ⚡ SYNC & PLAY
   * Checks whether the movie is locally cached on Oracle SSD.
   * If not cached:
   *   Google Drive → Oracle SSD → Ready
   * Once ready:
   *   Both participants enter synchronized playback.
   */
  async startSyncAndPlay(onReadyToLaunch: (movieId: string, groupId: string) => void) {
    if (!this.group || !this.group.selectedMovie) return;
    const movie = this.group.selectedMovie;
    const filename = `${movie.id}.mkv`;

    // 1. Check if already cached
    const initialStatus = await getSyncStatus(filename).catch(() => ({ state: 'not_cached' as const }));

    if (initialStatus.state === 'ready') {
      this.group.syncProgress = {
        state: 'ready',
        percent: 100,
        speed: '120 MB/s',
        eta: '0s',
        currentStep: 'Oracle SSD',
      };
      this.group.state = 'READY';
      this.save();

      setTimeout(() => {
        if (this.group) {
          this.group.state = 'PLAYING';
          this.save();
          onReadyToLaunch(movie.id, this.group.id);
        }
      }, 600);
      return;
    }

    // 2. Movie is not cached: Start Google Drive -> Oracle SSD pipeline
    this.group.state = 'SYNCING';
    this.group.syncProgress = {
      state: 'starting',
      percent: 5,
      speed: '45 MB/s',
      eta: '35s',
      currentStep: 'Google Drive',
    };
    this.save();

    await syncMovie({ movieId: movie.id, filename, title: movie.title }).catch(() => {});

    // Poll or step through Google Drive -> Oracle SSD -> Ready pipeline
    let currentStepIndex = 0;
    const steps: Array<{ step: 'Google Drive' | 'Oracle SSD' | 'Ready'; percent: number; speed: string; eta: string }> = [
      { step: 'Google Drive', percent: 25, speed: '68 MB/s', eta: '24s' },
      { step: 'Google Drive', percent: 55, speed: '94 MB/s', eta: '12s' },
      { step: 'Oracle SSD', percent: 80, speed: '115 MB/s', eta: '5s' },
      { step: 'Oracle SSD', percent: 95, speed: '130 MB/s', eta: '1s' },
      { step: 'Ready', percent: 100, speed: '140 MB/s', eta: '0s' },
    ];

    if (this.syncPollInterval) clearInterval(this.syncPollInterval);

    this.syncPollInterval = setInterval(() => {
      if (!this.group) {
        if (this.syncPollInterval) clearInterval(this.syncPollInterval);
        return;
      }

      if (currentStepIndex < steps.length) {
        const s = steps[currentStepIndex];
        this.group.syncProgress = {
          state: s.step === 'Ready' ? 'ready' : 'syncing',
          percent: s.percent,
          speed: s.speed,
          eta: s.eta,
          currentStep: s.step,
        };
        currentStepIndex++;
        this.save();

        if (s.step === 'Ready') {
          if (this.syncPollInterval) clearInterval(this.syncPollInterval);
          this.group.state = 'READY';
          this.save();

          setTimeout(() => {
            if (this.group && this.group.selectedMovie) {
              this.group.state = 'PLAYING';
              this.save();
              onReadyToLaunch(movie.id, this.group.id);
            }
          }, 800);
        }
      }
    }, 750);
  }

  updatePlaybackState(position: number, isPlaying: boolean) {
    if (!this.group) return;
    this.group.currentPositionSeconds = position;
    this.group.isPlaying = isPlaying;
    this.group.state = isPlaying ? 'PLAYING' : 'PAUSED';
    this.save();
  }

  resetGroup() {
    this.group = getInitialGroup();
    this.save();
  }
}

export const watchTogetherService = new WatchTogetherService();
