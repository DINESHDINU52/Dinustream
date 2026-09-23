/**
 * Resolve how a given item should actually be played.
 *
 * The old approach hard-coded one URL — `/api/jellyfin/videos/{id}/stream` with
 * `Static=true` — for every item on every device. That is direct play of the
 * original file, which means:
 *   - no adaptive bitrate, so a weak connection just stalls;
 *   - no quality ladder, so the quality menu could only ever be a label;
 *   - nothing plays at all when the container or codec is unsupported.
 *
 * Instead we ask Jellyfin. `POST /Items/{id}/PlaybackInfo` with a device profile
 * returns, per media source, whether the browser can direct-play it and — when it
 * cannot — a ready-made `TranscodingUrl` for an HLS ladder. That answer is
 * authoritative, and it is the same negotiation the official Jellyfin web client
 * performs.
 */

import { JellyfinMediaStream } from '@/lib/api/jellyfin';
import { buildDeviceProfile, DEFAULT_MAX_BITRATE } from './deviceProfile';

/** Base path of the server-side Jellyfin proxy (keeps the API key off the client). */
const PROXY_BASE = process.env.NEXT_PUBLIC_JELLYFIN_PROXY_URL || '/api/jellyfin';

export type PlaybackMethod = 'direct' | 'hls';

export interface ResolvedStreamSource {
  /** URL to hand to the video element or hls.js. */
  url: string;
  method: PlaybackMethod;
  /** Jellyfin media source id — needed for subtitle and progress calls. */
  mediaSourceId: string;
  /** Required by Jellyfin to correlate progress reports with a transcode. */
  playSessionId?: string;
  /** Streams belonging to the chosen source, for the audio/subtitle menus. */
  mediaStreams: JellyfinMediaStream[];
  /** Container of the chosen source, for diagnostics. */
  container?: string;
  /** Why a transcode was necessary, when Jellyfin reports it. */
  transcodeReasons?: string[];
}

interface PlaybackInfoMediaSource {
  Id: string;
  Container?: string;
  MediaStreams?: JellyfinMediaStream[];
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  TranscodingUrl?: string;
  TranscodingSubProtocol?: string;
  TranscodeReasons?: string[] | string;
  Bitrate?: number;
}

interface PlaybackInfoResponse {
  MediaSources?: PlaybackInfoMediaSource[];
  PlaySessionId?: string;
}

export interface ResolveOptions {
  /** Adaptive ceiling; also drives the size of Jellyfin's variant ladder. */
  maxBitrate?: number;
  /** Jellyfin stream index of the desired audio track. */
  audioStreamIndex?: number;
  /** Jellyfin stream index of the desired subtitle track, or -1 for none. */
  subtitleStreamIndex?: number;
  maxAudioChannels?: number;
  /** Stable per-browser id so Jellyfin can track and clean up sessions. */
  deviceId: string;
}

/**
 * Jellyfin returns `TranscodingUrl` as a server-relative path such as
 * `/videos/<id>/master.m3u8?…`. Rewrite it onto the proxy so the API key stays
 * server-side and every segment request the manifest points at is proxied too.
 */
function toProxyUrl(transcodingUrl: string): string {
  // Tolerate both absolute and relative forms.
  const path = transcodingUrl.startsWith('http')
    ? new URL(transcodingUrl).pathname + new URL(transcodingUrl).search
    : transcodingUrl;

  const withoutLeadingSlash = path.replace(/^\/+/, '');
  // Normalise Jellyfin's casing to the lowercase prefix the proxy matches on.
  const normalised = withoutLeadingSlash.replace(/^Videos\//i, 'videos/');
  return `${PROXY_BASE}/${normalised}`;
}

/** Direct-play URL for a source the browser can demux itself. */
function buildDirectUrl(itemId: string, options: ResolveOptions, mediaSourceId: string): string {
  const params = new URLSearchParams({
    Static: 'true',
    mediaSourceId,
    deviceId: options.deviceId,
  });
  if (typeof options.audioStreamIndex === 'number') {
    params.set('audioStreamIndex', String(options.audioStreamIndex));
  }
  return `${PROXY_BASE}/videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`;
}

/**
 * Last-resort URL used when PlaybackInfo itself fails (server unreachable,
 * plugin error). Direct play may still work for an MP4, and failing loudly in
 * the player is better than showing nothing.
 */
export function buildFallbackSource(itemId: string, deviceId: string): ResolvedStreamSource {
  return {
    url: buildDirectUrl(itemId, { deviceId }, itemId),
    method: 'direct',
    mediaSourceId: itemId,
    mediaStreams: [],
  };
}

export async function resolveStreamSource(
  itemId: string,
  options: ResolveOptions
): Promise<ResolvedStreamSource> {
  const profile = buildDeviceProfile({
    maxBitrate: options.maxBitrate ?? DEFAULT_MAX_BITRATE,
    maxAudioChannels: options.maxAudioChannels,
  });

  const body: Record<string, unknown> = {
    DeviceProfile: profile,
    /*
      `AllowVideoStreamCopy` lets Jellyfin remux rather than re-encode when only
      the container is the problem — an H.264 MKV becomes an HLS stream with the
      video passed through untouched, which is close to free on the server.
    */
    AllowVideoStreamCopy: true,
    AllowAudioStreamCopy: true,
    AutoOpenLiveStream: true,
    EnableDirectPlay: true,
    EnableDirectStream: true,
    EnableTranscoding: true,
    MaxStreamingBitrate: options.maxBitrate ?? DEFAULT_MAX_BITRATE,
    StartTimeTicks: 0,
  };

  if (typeof options.audioStreamIndex === 'number') {
    body.AudioStreamIndex = options.audioStreamIndex;
  }
  body.SubtitleStreamIndex =
    typeof options.subtitleStreamIndex === 'number' ? options.subtitleStreamIndex : -1;

  const res = await fetch(
    `${PROXY_BASE}/items/${encodeURIComponent(itemId)}/playback-info`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`PlaybackInfo failed (${res.status})`);
  }

  const info: PlaybackInfoResponse = await res.json();
  const source = info.MediaSources?.[0];

  if (!source) {
    throw new Error('Jellyfin returned no playable media source');
  }

  const reasons = Array.isArray(source.TranscodeReasons)
    ? source.TranscodeReasons
    : source.TranscodeReasons
      ? [source.TranscodeReasons]
      : undefined;

  const shared = {
    mediaSourceId: source.Id || itemId,
    playSessionId: info.PlaySessionId,
    mediaStreams: source.MediaStreams ?? [],
    container: source.Container,
    transcodeReasons: reasons,
  };

  const directPlayContainers = ['mp4', 'm4v', 'webm', 'mov'];
  const isDirectPlayableContainer = directPlayContainers.includes(
    (source.Container || '').toLowerCase()
  );

  // 1. If the browser can direct play natively (MP4, WebM, M4V), play directly with 0% server CPU overhead
  if (source.SupportsDirectPlay && isDirectPlayableContainer) {
    return { ...shared, url: buildDirectUrl(itemId, options, shared.mediaSourceId), method: 'direct' };
  }

  // 2. Otherwise use HLS (stream-copy remux or transcode)
  if (source.TranscodingUrl) {
    return { ...shared, url: toProxyUrl(source.TranscodingUrl), method: 'hls' };
  }

  // 3. Fallback direct stream
  if (source.SupportsDirectPlay || source.SupportsDirectStream) {
    return { ...shared, url: buildDirectUrl(itemId, options, shared.mediaSourceId), method: 'direct' };
  }

  throw new Error('No playable stream: the server cannot direct play or transcode this file');
}

/**
 * Stable per-browser device id.
 *
 * Jellyfin uses this to attribute and reap transcoding sessions. A fresh random
 * id on every page load leaves orphaned ffmpeg processes on the server until
 * they time out.
 */
const DEVICE_ID_KEY = 'dinustream_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'dinustream-server';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dinustream-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    // Storage unavailable; a per-session id is still better than none.
    return `dinustream-${Date.now().toString(36)}`;
  }
}

/**
 * Build the WebVTT URL for an external subtitle stream.
 *
 * Jellyfin's route shape is
 * `/Videos/{itemId}/{mediaSourceId}/Subtitles/{index}/0/Stream.vtt`, and it
 * converts SRT/ASS text formats to VTT on the fly.
 */
export function buildSubtitleUrl(
  itemId: string,
  mediaSourceId: string,
  streamIndex: number
): string {
  return (
    `${PROXY_BASE}/videos/${encodeURIComponent(itemId)}/` +
    `${encodeURIComponent(mediaSourceId)}/Subtitles/${streamIndex}/0/Stream.vtt`
  );
}
