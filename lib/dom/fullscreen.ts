/**
 * Typed wrappers around the vendor-prefixed Fullscreen API.
 *
 * Safari (desktop and iPadOS), older Firefox and legacy Edge each expose their
 * own spelling of every fullscreen method, and none of them are in the DOM lib
 * typings. The player and the orientation hook previously each cast `document`
 * and the target element to `any` to reach them — six separate escape hatches
 * with no shared behaviour, which is how they drifted apart (the player checked
 * four prefixes, the hook checked four different ones, and only one of them
 * handled the iOS `<video>`-only fallback).
 *
 * Everything lives here instead, typed and in one place.
 */

/** `document` plus the prefixed members browsers actually ship. */
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

/** An element plus the prefixed request methods. */
type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

/**
 * iOS Safari on iPhone refuses `requestFullscreen` on arbitrary elements and
 * only supports native fullscreen on a `<video>` element.
 */
type IOSVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
};

/** Screen Orientation API `lock`, which is still not in the standard typings. */
type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>;
};

type OrientationLockType =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

/**
 * Every spelling of the fullscreen change event. All four must be subscribed:
 * a user pressing Esc or the system fullscreen button fires only the vendor
 * event on older WebKit, which is how the player's UI state used to desync
 * from the actual fullscreen state.
 */
export const FULLSCREEN_CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as const;

/** The element currently presented fullscreen, across vendor prefixes. */
export function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

/** Whether anything is currently in native fullscreen. */
export function isFullscreenActive(): boolean {
  return getFullscreenElement() !== null;
}

/**
 * Request native fullscreen for `element`.
 *
 * Falls back to the iOS `<video>`-only path when no element-level API exists.
 * Resolves to `false` when the browser refuses, letting callers fall back to a
 * CSS "full window" presentation instead of leaving the UI in a broken state.
 */
export async function requestFullscreen(element: HTMLElement | null): Promise<boolean> {
  if (!element) return false;
  const target = element as FullscreenCapableElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    }
    if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
      return true;
    }
    if (target.mozRequestFullScreen) {
      await target.mozRequestFullScreen();
      return true;
    }
    if (target.msRequestFullscreen) {
      await target.msRequestFullscreen();
      return true;
    }

    // iOS Safari: only a <video> can go fullscreen.
    const video: IOSVideoElement | null =
      target instanceof HTMLVideoElement
        ? (target as IOSVideoElement)
        : (target.querySelector('video') as IOSVideoElement | null);

    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return true;
    }
  } catch {
    // Permission denied, gesture requirement not met, etc.
  }

  return false;
}

/**
 * Exit native fullscreen.
 *
 * `video` is optional and only used for the iOS `<video>` fullscreen mode,
 * which the document-level exit methods cannot leave.
 */
export async function exitFullscreen(video?: HTMLVideoElement | null): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as FullscreenDocument;

  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
    else if (doc.msExitFullscreen) await doc.msExitFullscreen();
  } catch {
    // Already exited, or the browser rejected the request.
  }

  const iosVideo = video as IOSVideoElement | null | undefined;
  if (iosVideo?.webkitExitFullscreen) {
    try {
      iosVideo.webkitExitFullscreen();
    } catch {
      // Not in iOS video fullscreen.
    }
  }
}

/**
 * Best-effort screen orientation lock. Desktop browsers and iOS Safari reject
 * this outright, so failure is expected and silent.
 */
export async function lockOrientation(orientation: OrientationLockType): Promise<boolean> {
  if (typeof window === 'undefined' || !window.screen?.orientation) return false;
  const screenOrientation = window.screen.orientation as LockableScreenOrientation;
  if (typeof screenOrientation.lock !== 'function') return false;

  try {
    await screenOrientation.lock(orientation);
    return true;
  } catch {
    return false;
  }
}
