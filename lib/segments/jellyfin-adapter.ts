import { JellyfinMediaSegmentDto, MediaSegment, SegmentType } from '@/types/segments';

const TICKS_PER_SECOND = 10_000_000;

export function ticksToSeconds(ticks: number): number {
  return Math.round((ticks / TICKS_PER_SECOND) * 10) / 10;
}

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function normalizeSegmentType(rawType: string): SegmentType {
  const upper = rawType.toUpperCase();
  if (upper.includes('INTRO')) return 'INTRO';
  if (upper.includes('RECAP')) return 'RECAP';
  if (upper.includes('OUTRO') || upper.includes('CREDIT')) return 'OUTRO';
  if (upper.includes('PREVIEW')) return 'PREVIEW';
  if (upper.includes('COMMERCIAL') || upper.includes('AD')) return 'COMMERCIAL';
  return 'INTRO';
}

export function getButtonLabelForType(type: SegmentType): string {
  switch (type) {
    case 'INTRO':
      return 'SKIP INTRO';
    case 'RECAP':
      return 'SKIP RECAP';
    case 'OUTRO':
      return 'SKIP OUTRO';
    case 'PREVIEW':
      return 'SKIP PREVIEW';
    case 'COMMERCIAL':
      return 'SKIP AD';
    default:
      return 'SKIP';
  }
}

/**
 * Adapter converting Jellyfin MediaSegment DTO into internal DinuStream MediaSegment model.
 * When real Jellyfin API endpoints are invoked, pass the raw item response here.
 */
export function mapJellyfinSegmentToMediaSegment(dto: JellyfinMediaSegmentDto): MediaSegment {
  const type = normalizeSegmentType(dto.Type);
  return {
    id: dto.Id || `segment-${dto.ItemId}-${type}`,
    type,
    title: dto.Type,
    buttonLabel: getButtonLabelForType(type),
    startSeconds: ticksToSeconds(dto.StartTicks),
    endSeconds: ticksToSeconds(dto.EndTicks),
    source: 'jellyfin',
  };
}
