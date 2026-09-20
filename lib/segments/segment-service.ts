import { MediaSegment, SegmentType, JellyfinMediaSegmentDto } from '@/types/segments';
import { DEFAULT_CINEMA_SEGMENTS, EPISODE_SEGMENTS } from './mock-segments';
import { mapJellyfinSegmentToMediaSegment } from './jellyfin-adapter';

export interface MediaSegmentProvider {
  name: string;
  getSegments(mediaId: string, episodeId?: string, duration?: number): Promise<MediaSegment[]> | MediaSegment[];
}

/**
 * Mock Media Segment Provider.
 * Serves the requested INTRO, RECAP, OUTRO, PREVIEW, COMMERCIAL segments.
 */
export class MockMediaSegmentProvider implements MediaSegmentProvider {
  name = 'MockMediaSegmentProvider';

  getSegments(mediaId: string, episodeId?: string, duration?: number): MediaSegment[] {
    // 1. Check for specific episode mock
    if (episodeId && EPISODE_SEGMENTS[episodeId]) {
      return [...EPISODE_SEGMENTS[episodeId]];
    }

    // 2. If episode has skipMarkers in its own model, adapt them
    // (backward compatibility with any episode object)

    // 3. Fallback to cinema segments, adjusting outro to duration if known
    const segments = DEFAULT_CINEMA_SEGMENTS.map((seg) => {
      if (seg.type === 'OUTRO' && duration && duration > 200) {
        const outroLength = 230; // 3m 50s
        return {
          ...seg,
          startSeconds: Math.max(0, Math.floor(duration - outroLength)),
          endSeconds: Math.floor(duration),
        };
      }
      if (seg.type === 'PREVIEW' && duration && duration > 200) {
        const outroLength = 230;
        const previewLength = 140;
        return {
          ...seg,
          startSeconds: Math.max(0, Math.floor(duration - outroLength - previewLength)),
          endSeconds: Math.max(0, Math.floor(duration - outroLength)),
        };
      }
      return { ...seg };
    });

    return segments.sort((a, b) => a.startSeconds - b.startSeconds);
  }
}

/**
 * Future Jellyfin Provider stub.
 * Demonstrates how Jellyfin API seamlessly slots in without player modification.
 */
export class JellyfinMediaSegmentProvider implements MediaSegmentProvider {
  name = 'JellyfinMediaSegmentProvider';
  private baseUrl?: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getSegments(mediaId: string, episodeId?: string): Promise<MediaSegment[]> {
    if (!this.baseUrl || !this.apiKey) {
      // Fallback if not configured yet
      return new MockMediaSegmentProvider().getSegments(mediaId, episodeId);
    }

    try {
      const itemId = episodeId || mediaId;
      const response = await fetch(`${this.baseUrl}/Items/${itemId}/MediaSegments`, {
        headers: {
          'X-Emby-Token': this.apiKey,
        },
      });
      if (!response.ok) throw new Error(`Jellyfin segment fetch failed: ${response.status}`);
      const data = await response.json();
      return (data.Items || []).map((item: JellyfinMediaSegmentDto) =>
        mapJellyfinSegmentToMediaSegment(item)
      );
    } catch {
      return new MockMediaSegmentProvider().getSegments(mediaId, episodeId);
    }
  }
}

/**
 * Registry / Manager for Media Segment Providers
 */
class MediaSegmentManager {
  private activeProvider: MediaSegmentProvider = new MockMediaSegmentProvider();

  setProvider(provider: MediaSegmentProvider) {
    this.activeProvider = provider;
  }

  getProvider(): MediaSegmentProvider {
    return this.activeProvider;
  }

  async fetchSegments(mediaId: string, episodeId?: string, duration?: number): Promise<MediaSegment[]> {
    try {
      const itemId = episodeId || mediaId;
      const res = await fetch(`/api/jellyfin/items/${itemId}/segments`);
      if (res.ok) {
        const data = await res.json();
        if (data.Items && data.Items.length > 0) {
          return data.Items.map((item: { Id: string; Type: string; StartTicks: number; EndTicks: number }) => {
            const rawType = (item.Type || 'INTRO').toUpperCase();
            const validTypes: SegmentType[] = ['INTRO', 'RECAP', 'OUTRO', 'PREVIEW', 'COMMERCIAL'];
            const type: SegmentType = validTypes.includes(rawType as SegmentType) ? (rawType as SegmentType) : 'INTRO';

            return {
              id: item.Id,
              type,
              title: item.Type === 'Intro' ? 'Intro Sequence' : item.Type === 'Recap' ? 'Previously On' : 'Ending Credits',
              buttonLabel: `SKIP ${type}`,
              startSeconds: Math.floor((item.StartTicks || 0) / 10000000),
              endSeconds: Math.floor((item.EndTicks || 0) / 10000000),
              source: 'jellyfin' as const,
            };
          });
        }
      }
    } catch {
      // Graceful fallback to mock provider
    }
    return this.activeProvider.getSegments(mediaId, episodeId, duration);
  }

  getSegmentsSync(mediaId: string, episodeId?: string, duration?: number): MediaSegment[] {
    const res = this.activeProvider.getSegments(mediaId, episodeId, duration);
    if (Array.isArray(res)) return res;
    return [];
  }
}

export const mediaSegmentManager = new MediaSegmentManager();
