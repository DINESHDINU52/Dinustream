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
    title: 'Universe of Sound',
    subtitle: 'Discrete 7.1.4 Object Audio Resonance',
    localPath: '/atmos/atmos-01.mp4',
    fallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'atmos-02',
    title: 'Acoustic Horizon',
    subtitle: 'Spatial Height Channels & Sub-bass Sweep',
    localPath: '/atmos/atmos-02.mp4',
    fallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'atmos-03',
    title: 'Pure Cinema Bitstream',
    subtitle: 'High Dynamic Soundstage Calibration',
    localPath: '/atmos/atmos-03.mp4',
    fallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'atmos-04',
    title: 'Silent Velocity',
    subtitle: 'Multi-Directional Sound Field Dispersion',
    localPath: '/atmos/atmos-04.mp4',
    fallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'custom-01',
    title: 'Dinu & Kanmani Private Screen',
    subtitle: 'Bespoke Private Cinema Atmos Intro',
    localPath: '/atmos/custom-01.mp4',
    fallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

export const ATMOS_CLIPS = FALLBACK_ATMOS_CLIPS;

const LAST_CLIP_KEY = 'dinustream_last_atmos_clip_id';

/**
 * Fetch hosted Dolby clips from server directory /opt/dinustream/cache/dolby
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
 * Randomly select an Atmos video clip while guaranteeing that
 * the same clip is never selected twice consecutively.
 */
export function getNextRandomAtmosClip(pool: AtmosClip[] = FALLBACK_ATMOS_CLIPS): AtmosClip {
  let lastClipId: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      lastClipId = sessionStorage.getItem(LAST_CLIP_KEY) || localStorage.getItem(LAST_CLIP_KEY);
    } catch {
      // Ignore
    }
  }

  const eligibleClips = pool.filter((clip) => clip.id !== lastClipId);
  const candidatePool = eligibleClips.length > 0 ? eligibleClips : pool;

  const randomIndex = Math.floor(Math.random() * candidatePool.length);
  const selectedClip = candidatePool[randomIndex] || pool[0];

  if (typeof window !== 'undefined' && selectedClip) {
    try {
      sessionStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
      localStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
    } catch {}
  }

  return selectedClip;
}
