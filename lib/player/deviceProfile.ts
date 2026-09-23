/**
 * Jellyfin device profile.
 *
 * This is the contract that makes adaptive streaming work. `PlaybackInfo`
 * decides between direct play, direct stream and transcoding purely from what
 * the client claims it can handle — so with no profile supplied (the previous
 * behaviour: `POST /playback-info` with an empty body) Jellyfin has to guess,
 * returns no `TranscodingUrl`, and the app was left forcing `Static=true` on the
 * original file. That is why an MKV with a TrueHD track played on desktop Chrome
 * and failed silently on iOS: browsers cannot demux Matroska or decode TrueHD.
 *
 * Capabilities are probed at runtime with `canPlayType` / `MediaSource.isTypeSupported`
 * rather than hard-coded, so Safari, Firefox and Chrome each get an honest answer
 * and Jellyfin transcodes only what it actually has to.
 */

export interface DirectPlayProfile {
  Container: string;
  Type: 'Video' | 'Audio';
  VideoCodec?: string;
  AudioCodec?: string;
}

export interface TranscodingProfile {
  Container: string;
  Type: 'Video' | 'Audio';
  VideoCodec?: string;
  AudioCodec: string;
  Protocol: 'hls' | 'http';
  Context: 'Streaming' | 'Static';
  MaxAudioChannels?: string;
  MinSegments?: number;
  BreakOnNonKeyFrames?: boolean;
}

export interface CodecProfileCondition {
  Condition: 'Equals' | 'NotEquals' | 'LessThanEqual' | 'GreaterThanEqual' | 'EqualsAny';
  Property: string;
  Value: string;
  IsRequired: boolean;
}

export interface CodecProfile {
  Type: 'Video' | 'VideoAudio' | 'Audio';
  Codec?: string;
  Conditions: CodecProfileCondition[];
}

export interface SubtitleProfile {
  Format: string;
  Method: 'External' | 'Embed' | 'Encode' | 'Hls';
}

export interface JellyfinDeviceProfile {
  Name: string;
  MaxStreamingBitrate: number;
  MaxStaticBitrate: number;
  MusicStreamingTranscodingBitrate: number;
  DirectPlayProfiles: DirectPlayProfile[];
  TranscodingProfiles: TranscodingProfile[];
  CodecProfiles: CodecProfile[];
  SubtitleProfiles: SubtitleProfile[];
}

/** Default ceiling when the connection cannot be measured. ~20 Mbit/s. */
export const DEFAULT_MAX_BITRATE = 20_000_000;

function canPlay(mime: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('video');
  return el.canPlayType(mime) !== '';
}

function mseSupports(mime: string): boolean {
  if (typeof window === 'undefined') return false;
  const MS = window.MediaSource;
  return Boolean(MS?.isTypeSupported?.(mime));
}

/** What this browser can play without any server-side work. */
export interface ClientCapabilities {
  hevc: boolean;
  av1: boolean;
  /** fMP4/CMAF segments in MSE — required for HEVC-in-HLS on most browsers. */
  fmp4: boolean;
  eac3: boolean;
  ac3: boolean;
  flac: boolean;
  opus: boolean;
  /** Native HLS, i.e. Safari. */
  nativeHls: boolean;
}

export function detectClientCapabilities(): ClientCapabilities {
  return {
    hevc:
      mseSupports('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
      canPlay('video/mp4; codecs="hvc1.1.6.L93.B0"'),
    av1: mseSupports('video/mp4; codecs="av01.0.05M.08"'),
    fmp4: mseSupports('video/mp4; codecs="avc1.42E01E"'),
    // Dolby Digital passthrough only really works in Safari/Edge.
    eac3: canPlay('audio/mp4; codecs="ec-3"'),
    ac3: canPlay('audio/mp4; codecs="ac-3"'),
    flac: canPlay('audio/mp4; codecs="flac"'),
    opus: canPlay('audio/webm; codecs="opus"'),
    nativeHls: canPlay('application/vnd.apple.mpegurl'),
  };
}

/**
 * Build the profile.
 *
 * `maxBitrate` is the adaptive ceiling. Jellyfin derives the HLS variant ladder
 * from it, so it is also what makes the quality menu meaningful.
 */
export function buildDeviceProfile(options?: {
  maxBitrate?: number;
  /** Stereo downmix keeps surround sources playable on laptop speakers. */
  maxAudioChannels?: number;
}): JellyfinDeviceProfile {
  const caps = detectClientCapabilities();
  const maxBitrate = options?.maxBitrate ?? DEFAULT_MAX_BITRATE;
  const maxAudioChannels = options?.maxAudioChannels ?? 2;

  const directAudio = ['aac', 'mp3', 'opus', 'vorbis'];
  if (caps.ac3) directAudio.push('ac3');
  if (caps.eac3) directAudio.push('eac3');
  if (caps.flac) directAudio.push('flac');

  const directVideo = ['h264', 'vp8', 'vp9'];
  if (caps.hevc) directVideo.push('hevc', 'h265');
  if (caps.av1) directVideo.push('av1');

  return {
    Name: 'DinuStream Web',
    MaxStreamingBitrate: maxBitrate,
    MaxStaticBitrate: maxBitrate,
    MusicStreamingTranscodingBitrate: 384_000,

    /*
      Containers the browser can demux itself. Matroska is intentionally absent:
      no browser supports it, and claiming it is what allowed the app to hand an
      unplayable MKV straight to the <video> element.
    */
    DirectPlayProfiles: [
      {
        Container: 'mp4,m4v',
        Type: 'Video',
        VideoCodec: directVideo.join(','),
        AudioCodec: directAudio.join(','),
      },
      { Container: 'webm', Type: 'Video', VideoCodec: 'vp8,vp9,av1', AudioCodec: 'vorbis,opus' },
      { Container: 'mp3', Type: 'Audio' },
      { Container: 'aac', Type: 'Audio' },
      { Container: 'flac', Type: 'Audio' },
    ],

    /*
      Everything else becomes HLS. `BreakOnNonKeyFrames` lets Jellyfin start a
      transcode from an arbitrary seek point instead of the previous keyframe,
      which is what keeps seeking responsive on a transcoded stream.
    */
    TranscodingProfiles: [
      {
        Container: 'ts',
        Type: 'Video',
        VideoCodec: caps.hevc ? 'h264,hevc' : 'h264',
        AudioCodec: 'aac,mp3,copy',
        Protocol: 'hls',
        Context: 'Streaming',
        MaxAudioChannels: String(maxAudioChannels),
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
      {
        Container: 'mp4',
        Type: 'Video',
        VideoCodec: caps.hevc ? 'h264,hevc' : 'h264',
        AudioCodec: 'aac,mp3',
        Protocol: 'hls',
        Context: 'Streaming',
        MaxAudioChannels: String(maxAudioChannels),
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
      {
        Container: 'aac',
        Type: 'Audio',
        AudioCodec: 'aac',
        Protocol: 'http',
        Context: 'Streaming',
      },
    ],

    /*
      Upper bounds. Without the H.264 level/profile caps a browser is offered a
      stream it advertises support for but cannot actually decode in hardware,
      which shows up as stutter rather than an error.
    */
    CodecProfiles: [
      {
        Type: 'Video',
        Codec: 'h264',
        Conditions: [
          {
            Condition: 'EqualsAny',
            Property: 'VideoProfile',
            Value: 'high|main|baseline|constrained baseline',
            IsRequired: false,
          },
          { Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '52', IsRequired: false },
        ],
      },
      {
        Type: 'VideoAudio',
        Conditions: [
          {
            Condition: 'LessThanEqual',
            Property: 'AudioChannels',
            Value: String(Math.max(2, maxAudioChannels)),
            IsRequired: false,
          },
        ],
      },
    ],

    /*
      Subtitles.

      `External` means Jellyfin serves the track as a separate WebVTT file that
      we attach with a `<track>` element — the only method that keeps subtitles
      switchable without restarting the transcode. Bitmap formats (PGS/DVBSUB)
      cannot be converted to text, so those are burned in (`Encode`).
    */
    SubtitleProfiles: [
      { Format: 'vtt', Method: 'External' },
      { Format: 'srt', Method: 'External' },
      { Format: 'subrip', Method: 'External' },
      { Format: 'ass', Method: 'Encode' },
      { Format: 'ssa', Method: 'Encode' },
      { Format: 'pgs', Method: 'Encode' },
      { Format: 'pgssub', Method: 'Encode' },
      { Format: 'dvdsub', Method: 'Encode' },
      { Format: 'dvbsub', Method: 'Encode' },
    ],
  };
}
