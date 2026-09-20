export type SegmentType = 'INTRO' | 'RECAP' | 'OUTRO' | 'PREVIEW' | 'COMMERCIAL';

export type SkipBehavior = 'auto' | 'ask' | 'never';

export interface MediaSegment {
  id: string;
  type: SegmentType;
  title: string;
  buttonLabel: string;
  startSeconds: number;
  endSeconds: number;
  /** Optional metadata indicating source (e.g. 'jellyfin', 'mock', 'edl') */
  source?: 'jellyfin' | 'mock' | 'edl';
}

export interface SegmentSettings {
  skipBehavior: SkipBehavior;
  /** Optional per-segment overrides if user wants e.g. Auto-Skip Intro but Ask for Recap */
  perSegmentOverrides?: Partial<Record<SegmentType, SkipBehavior>>;
}

/**
 * Interface mimicking Jellyfin MediaSegment / Chapter metadata.
 * When real Jellyfin is connected, the API response maps cleanly to this structure.
 */
export interface JellyfinMediaSegmentDto {
  Id: string;
  ItemId: string;
  Type: 'Intro' | 'Recap' | 'Outro' | 'Preview' | 'Commercial' | string;
  StartTicks: number; // 1 second = 10,000,000 ticks
  EndTicks: number;
}
