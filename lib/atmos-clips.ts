export interface AtmosClip {
  id: string;
  title: string;
  subtitle: string;
  localPath: string;
  fallbackUrl: string;
  isHosted?: boolean;
  filename?: string;
}

export const FALLBACK_ATMOS_CLIPS: AtmosClip[] = [
  {
    id: 'atmos-01',
    title: 'Horizon of Sound',
    subtitle: 'Discrete Object Audio Resonance',
    localPath: '/atmos/clip-01.mp4',
    fallbackUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'atmos-02',
    title: 'Dynamic Motion Spectrum',
    subtitle: 'Spatial Height Channels & Sub-bass Sweep',
    localPath: '/atmos/clip-02.mp4',
    fallbackUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 'atmos-03',
    title: 'Pure Cinema Presentation',
    subtitle: 'High Dynamic Soundstage Calibration',
    localPath: '/atmos/clip-03.mp4',
    fallbackUrl: 'https://www.w3schools.com/tags/movie.mp4',
  },
  {
    id: 'atmos-04',
    title: 'Cinematic Soundstage',
    subtitle: 'Multi-Directional Sound Field Dispersion',
    localPath: '/atmos/clip-04.mp4',
    fallbackUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  },
  {
    id: 'atmos-05',
    title: 'Audio Bloom Resonance',
    subtitle: 'Bespoke Private Cinema Spatial Calibration',
    localPath: '/atmos/clip-05.mp4',
    fallbackUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
  },
];

export const ATMOS_CLIPS = FALLBACK_ATMOS_CLIPS;

const LAST_CLIP_KEY = 'dinustream_last_atmos_clip_id';
const CLIP_HISTORY_KEY = 'dinustream_atmos_history';

/**
 * Fetch hosted clips from server directory /opt/dinustream/cache/dolby
 */
export async function fetchHostedDolbyClips(): Promise<AtmosClip[]> {
  try {
    const res = await fetch('/api/dolby/clips');
    if (!res.ok) return FALLBACK_ATMOS_CLIPS;
    const data = await res.json();
    if (data.success && Array.isArray(data.clips) && data.clips.length > 0) {
      return data.clips as AtmosClip[];
    }
  } catch (err) {
    console.warn('[AtmosClips] Failed to fetch server clips, using fallback clips:', err);
  }
  return FALLBACK_ATMOS_CLIPS;
}

/**
 * Non-repeating rotation: guarantees playing a different video every single time.
 * Cycles through unplayed clips before repeating any video.
 */
export function getNextRandomAtmosClip(pool: AtmosClip[] = FALLBACK_ATMOS_CLIPS): AtmosClip {
  let playedHistory: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(CLIP_HISTORY_KEY) || localStorage.getItem(CLIP_HISTORY_KEY);
      if (stored) playedHistory = JSON.parse(stored);
    } catch {
      playedHistory = [];
    }
  }

  // Find clips from pool that haven't been played in the current cycle
  let candidates = pool.filter((clip) => !playedHistory.includes(clip.id));

  // If all clips in pool have been played, reset history and exclude just the last played clip
  if (candidates.length === 0) {
    const lastId = playedHistory[playedHistory.length - 1];
    candidates = pool.filter((clip) => clip.id !== lastId);
    if (candidates.length === 0) candidates = pool;
    playedHistory = [];
  }

  // Pick a candidate
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedClip = candidates[randomIndex] || pool[0];

  // Record this clip in session & local storage
  if (typeof window !== 'undefined' && selectedClip) {
    try {
      playedHistory.push(selectedClip.id);
      sessionStorage.setItem(CLIP_HISTORY_KEY, JSON.stringify(playedHistory));
      localStorage.setItem(CLIP_HISTORY_KEY, JSON.stringify(playedHistory));
      sessionStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
      localStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
    } catch {}
  }

  return selectedClip;
}
