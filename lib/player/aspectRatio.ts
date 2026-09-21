/**
 * Video aspect-ratio / zoom presentation modes.
 *
 * Why this exists
 * ---------------
 * The player box is a 16:9 frame that scales with the device, but source files
 * are not all 16:9 — a 2.39:1 scope master letterboxes top and bottom, a 4:3
 * broadcast master pillarboxes left and right, and on a phone in landscape the
 * screen itself is usually ~19.5:9, wider than the frame. The video element was
 * hard-coded to `object-contain`, so there was no way to fill the screen; black
 * bars were unavoidable on nearly every combination of file and device.
 *
 * These modes are expressed purely as `object-fit` plus an optional uniform
 * scale, which is deliberate: both are GPU-composited properties that work
 * identically in every browser, in native fullscreen, and while casting. The
 * alternative — forcing a CSS `aspect-ratio` on the element — fights the
 * definite width/height the player frame supplies and silently degrades to no
 * effect.
 */

export type AspectRatioMode = 'fit' | 'fill' | 'stretch' | 'zoom-110' | 'zoom-125' | 'zoom-150';

export const DEFAULT_ASPECT_RATIO_MODE: AspectRatioMode = 'fit';

export interface AspectRatioOption {
  id: AspectRatioMode;
  /** Short label for the menu row. */
  label: string;
  /** One-line explanation of the trade-off this mode makes. */
  description: string;
  /** Compact label for the control-bar indicator. */
  short: string;
}

export const ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  {
    id: 'fit',
    label: 'Fit (Original)',
    description: 'Whole frame, true geometry. May show black bars.',
    short: 'FIT',
  },
  {
    id: 'fill',
    label: 'Fill Screen',
    description: 'Crops the edges to remove black bars. No distortion.',
    short: 'FILL',
  },
  {
    id: 'stretch',
    label: 'Stretch',
    description: 'Fills the screen by distorting the picture.',
    short: 'STR',
  },
  { id: 'zoom-110', label: 'Zoom 110%', description: 'Slight crop into the frame.', short: '110' },
  { id: 'zoom-125', label: 'Zoom 125%', description: 'Moderate crop into the frame.', short: '125' },
  { id: 'zoom-150', label: 'Zoom 150%', description: 'Heavy crop into the frame.', short: '150' },
] as const;

/** Every valid mode id, for validating persisted values. */
const VALID_MODES = new Set<string>(ASPECT_RATIO_OPTIONS.map((o) => o.id));

export function isAspectRatioMode(value: unknown): value is AspectRatioMode {
  return typeof value === 'string' && VALID_MODES.has(value);
}

export function getAspectRatioOption(mode: AspectRatioMode): AspectRatioOption {
  return ASPECT_RATIO_OPTIONS.find((o) => o.id === mode) ?? ASPECT_RATIO_OPTIONS[0];
}

/** `object-fit` value for a mode. Zoom levels crop, so they build on `cover`. */
function objectFitFor(mode: AspectRatioMode): 'contain' | 'cover' | 'fill' {
  switch (mode) {
    case 'fill':
      return 'cover';
    case 'stretch':
      return 'fill';
    default:
      // `fit` and every zoom level keep the true geometry; zoom adds scale.
      return 'contain';
  }
}

/** Uniform scale factor for a mode. */
function scaleFor(mode: AspectRatioMode): number {
  switch (mode) {
    case 'zoom-110':
      return 1.1;
    case 'zoom-125':
      return 1.25;
    case 'zoom-150':
      return 1.5;
    default:
      return 1;
  }
}

/**
 * Inline style for the `<video>` element.
 *
 * `translateZ(0)` is kept from the original implementation to force a
 * compositing layer; the scale is folded into the same transform so the element
 * is not promoted twice.
 */
export function getVideoPresentationStyle(mode: AspectRatioMode): React.CSSProperties {
  const scale = scaleFor(mode);

  return {
    objectFit: objectFitFor(mode),
    transform: scale === 1 ? 'translateZ(0)' : `translateZ(0) scale(${scale})`,
    // Cropped modes must not paint outside the frame.
    willChange: scale === 1 ? undefined : 'transform',
  };
}

/** Next mode in the list, for a cycle-through control or keyboard shortcut. */
export function getNextAspectRatioMode(mode: AspectRatioMode): AspectRatioMode {
  const index = ASPECT_RATIO_OPTIONS.findIndex((o) => o.id === mode);
  return ASPECT_RATIO_OPTIONS[(index + 1) % ASPECT_RATIO_OPTIONS.length].id;
}
