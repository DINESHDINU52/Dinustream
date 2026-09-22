import { MediaSegment, SegmentType } from '@/types/segments';

/**
 * Media segments (intro / recap / outro skip markers).
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * This module used to fall back to `MockMediaSegmentProvider`, which returned a
 * fixed set of invented markers for *every* title in the library:
 *
 *   INTRO  0:00–1:32   "Cinematic Prologue & Opening Titles"
 *   RECAP  1:32–2:45   "Previously on Arrakis"
 *   OUTRO  last ~4 min "Ending Credits"
 *
 * Those are Dune placeholders from early development. Because Jellyfin answers
 * 404 for `/items/{id}/segments` unless a media-segments plugin is installed, the
 * fallback ran every single time — so a "SKIP INTRO" button appeared 0–92s into
 * any movie, followed by a "Previously on Arrakis" recap prompt, on content that
 * has neither. Pressing them jumped playback to an arbitrary timestamp.
 *
 * There is no honest way to guess where an intro is without server-side
 * detection, so when Jellyfin has no segments we now report none. The skip UI
 * simply does not appear, which is correct.
 *
 * To turn the feature on for real, install a media-segments provider plugin in
 * Jellyfin (Chapter Segments / Intro Skipper). The parsing path below already
 * handles the response, so no client change is needed.
 */

export interface MediaSegmentProvider {
  name: string;
  getSegments(
    mediaId: string,
    episodeId?: string,
    duration?: number
  ): Promise<MediaSegment[]> | MediaSegment[];
}

/**
 * Default provider: reports no segments.
 *
 * Deliberately empty rather than removed, so the manager always has a provider
 * and callers never have to null-check.
 */
export class EmptyMediaSegmentProvider implements MediaSegmentProvider {
  name = 'EmptyMediaSegmentProvider';

  getSegments(): MediaSegment[] {
    return [];
  }
}

const VALID_SEGMENT_TYPES: SegmentType[] = ['INTRO', 'RECAP', 'OUTRO', 'PREVIEW', 'COMMERCIAL'];

/** Jellyfin reports times in ticks: 10,000,000 per second. */
const TICKS_PER_SECOND = 10_000_000;

interface JellyfinSegmentItem {
  Id: string;
  Type?: string;
  StartTicks?: number;
  EndTicks?: number;
}

function titleForType(type: SegmentType): string {
  switch (type) {
    case 'INTRO':
      return 'Intro Sequence';
    case 'RECAP':
      return 'Previously On';
    case 'OUTRO':
      return 'Ending Credits';
    case 'PREVIEW':
      return 'Next Time';
    case 'COMMERCIAL':
      return 'Break';
  }
}

function adaptJellyfinSegment(item: JellyfinSegmentItem): MediaSegment {
  const raw = (item.Type || 'INTRO').toUpperCase() as SegmentType;
  const type: SegmentType = VALID_SEGMENT_TYPES.includes(raw) ? raw : 'INTRO';

  return {
    id: item.Id,
    type,
    title: titleForType(type),
    buttonLabel: `SKIP ${type}`,
    startSeconds: Math.floor((item.StartTicks || 0) / TICKS_PER_SECOND),
    endSeconds: Math.floor((item.EndTicks || 0) / TICKS_PER_SECOND),
    source: 'jellyfin' as const,
  };
}

class MediaSegmentManager {
  private activeProvider: MediaSegmentProvider = new EmptyMediaSegmentProvider();

  setProvider(provider: MediaSegmentProvider) {
    this.activeProvider = provider;
  }

  getProvider(): MediaSegmentProvider {
    return this.activeProvider;
  }

  /**
   * Fetch real segments from Jellyfin, falling back to the active provider.
   *
   * A 404 here is the normal case for a server without a segments plugin, so it
   * is handled quietly rather than logged as an error.
   */
  async fetchSegments(
    mediaId: string,
    episodeId?: string,
    duration?: number
  ): Promise<MediaSegment[]> {
    const itemId = episodeId || mediaId;

    try {
      const res = await fetch(`/api/jellyfin/items/${encodeURIComponent(itemId)}/segments`);
      if (res.ok) {
        const data = await res.json();
        const items: JellyfinSegmentItem[] = data?.Items ?? [];
        if (items.length > 0) {
          return items
            .map(adaptJellyfinSegment)
            // Guard against a plugin emitting a zero-length or inverted range.
            .filter((seg) => seg.endSeconds > seg.startSeconds)
            .sort((a, b) => a.startSeconds - b.startSeconds);
        }
      }
    } catch {
      // Network failure — fall through to the provider.
    }

    const fallback = this.activeProvider.getSegments(mediaId, episodeId, duration);
    return Array.isArray(fallback) ? fallback : [];
  }

  getSegmentsSync(mediaId: string, episodeId?: string, duration?: number): MediaSegment[] {
    const res = this.activeProvider.getSegments(mediaId, episodeId, duration);
    return Array.isArray(res) ? res : [];
  }
}

export const mediaSegmentManager = new MediaSegmentManager();
