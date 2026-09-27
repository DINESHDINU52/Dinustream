'use client';

// First-run preshow: while the Python daemon pulls a movie from Google Drive to
// the local SSD, one random clip from the Dolby *folder* plays to completion.
//
// Rules:
//  - Random clip, read live from the folder (never a hard-coded file).
//  - Plays fully once (no loop). "Skip ad" is always available.
//  - Never traps the viewer: if the folder is empty, the clip can't be demuxed,
//    or it stalls before starting, we hand off to the movie immediately.
//
// Autoplay is muted to satisfy browser policy; a sound toggle is provided.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { fetchRandomDolbyAd } from '@/lib/jellyfin/queries';
import { SkipForward, Volume2, VolumeX, HardDriveDownload } from 'lucide-react';

export interface DolbyAdOverlayProps {
  media: MediaItem;
  /** Called when the ad finishes, is skipped, or cannot play. */
  onComplete: () => void;
}

export function DolbyAdOverlay({ media, onComplete }: DolbyAdOverlayProps) {
  const [adUrl, setAdUrl] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCompleteRef.current();
  }, []);

  // Resolve one random clip from the Dolby folder. Empty folder -> skip ad.
  useEffect(() => {
    let cancelled = false;
    fetchRandomDolbyAd()
      .then((ad) => {
        if (cancelled) return;
        if (!ad) {
          finish();
          return;
        }
        setAdUrl(`/jellyfin/Videos/${ad.itemId}/stream?Static=true`);
      })
      .catch(() => {
        if (!cancelled) finish();
      })
      .finally(() => {
        if (!cancelled) setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [finish]);

  // Safety net: if the clip never actually starts (unsupported container or a
  // stall), don't strand the viewer on black — go to the movie.
  useEffect(() => {
    if (!adUrl || started) return;
    const timer = setTimeout(finish, 10000);
    return () => clearTimeout(timer);
  }, [adUrl, started, finish]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const artwork = media.backdropUrl || media.posterUrl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] bg-black select-none overflow-hidden"
    >
      {adUrl ? (
        <video
          ref={videoRef}
          src={adUrl}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain bg-black"
          onPlaying={() => setStarted(true)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
          onEnded={finish}
          onError={finish}
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artwork} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          {!resolved && <div className="absolute inset-0 animate-pulse bg-black/40" />}
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70" />

      {/* Skip ad — always available */}
      <button
        onClick={finish}
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold text-white cinema-focus"
      >
        <SkipForward className="h-4 w-4" />
        Skip ad
      </button>

      {/* Sound toggle (autoplay starts muted by policy) */}
      {adUrl && (
        <button
          onClick={toggleMute}
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full glass px-3 py-2 text-xs font-semibold text-white cinema-focus"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? 'Sound on' : 'Sound off'}
        </button>
      )}

      {/* Preshow footer */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-8">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-sky-400">
            Dolby Atmos Preshow
          </p>
          <h2 className="break-words text-lg font-bold text-white sm:text-xl">{media.title}</h2>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <HardDriveDownload className="h-3.5 w-3.5 text-sky-400" />
            Pulling from Drive to SSD for instant playback…
          </p>
          {adUrl && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
