export interface AtmosClip {
  id: string;
  title: string;
  subtitle: string;
  localPath: string;
  fallbackUrl: string;
}

export const ATMOS_CLIPS: AtmosClip[] = [
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

const LAST_CLIP_KEY = 'dinustream_last_atmos_clip_id';

/**
 * Randomly select an Atmos video clip while guaranteeing that
 * the same clip is never selected twice consecutively.
 */
export function getNextRandomAtmosClip(): AtmosClip {
  let lastClipId: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      lastClipId = sessionStorage.getItem(LAST_CLIP_KEY) || localStorage.getItem(LAST_CLIP_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  // Filter out the last selected clip to prevent consecutive repeats
  const eligibleClips = ATMOS_CLIPS.filter((clip) => clip.id !== lastClipId);
  const pool = eligibleClips.length > 0 ? eligibleClips : ATMOS_CLIPS;

  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedClip = pool[randomIndex];

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
      localStorage.setItem(LAST_CLIP_KEY, selectedClip.id);
    } catch {
      // Ignore
    }
  }

  return selectedClip;
}
