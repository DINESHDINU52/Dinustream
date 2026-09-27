'use client';

// Full-screen "Sync & Play" prelude: while the Python Sync Manager pulls the
// movie from Google Drive -> local NVMe, a Dolby Atmos clip plays as a cinematic
// filler so the wait never feels dead. When the copy is done (or the viewer
// skips), it hands off to the real movie.

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncStatusResponse, getSyncStatus, startSync } from '@/lib/api/syncManager';
import { fetchDolbyBumper } from '@/lib/jellyfin/queries';
import { HardDriveDownload, Loader2, Play, X } from 'lucide-react';

export interface CacheAndPlayOverlayProps {
  media: MediaItem;
  filename: string | null;
  onReady: () => void;
  onClose: () => void;
}

export function CacheAndPlayOverlay({ media, filename, onReady, onClose }: CacheAndPlayOverlayProps) {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [bumperUrl, setBumperUrl] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Grab the first Dolby library item as the Atmos bumper video.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bumper = await fetchDolbyBumper();
      if (!cancelled && bumper) {
        setBumperUrl(`/jellyfin/Videos/${bumper.itemId}/stream?Static=true`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Kick the cache copy + poll until ready, then hand off to the movie.
  useEffect(() => {
    if (!filename) {
      // Nothing to sync (or unknown file) — go straight to playback.
      onReadyRef.current();
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    void startSync(filename);

    const check = async () => {
      try {
        const s = await getSyncStatus(filename);
        if (cancelled) return;
        setStatus(s);
        setPollError(null);
        if (s.state === 'ready' || s.percentage >= 100) {
          if (timer) clearInterval(timer);
          onReadyRef.current();
        }
      } catch (e) {
        if (!cancelled) setPollError(e instanceof Error ? e.message : 'Cache status unavailable');
      }
    };

    void check();
    timer = setInterval(check, 1200);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [filename]);

  const pct = Math.min(100, Math.max(0, status?.percentage ?? 0));
  const artwork = media.backdropUrl || media.posterUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black select-none overflow-hidden"
      >
        {/* Dolby Atmos bumper — plays while the movie warms up */}
        {bumperUrl ? (
          <video
            ref={videoRef}
            src={bumperUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={artwork} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

        {/* Movie title + cache progress */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-md space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-sky-400">
                Dolby Atmos Screening
              </p>
              <h2 className="text-2xl font-bold text-white tracking-tight break-words">{media.title}</h2>
              <p className="text-xs text-slate-400">Caching to SSD for instant playback…</p>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <HardDriveDownload className="w-3.5 h-3.5 text-sky-400" />
                  {pct >= 100 || status?.state === 'ready' ? (
                    <span className="text-emerald-300">Cached — starting your movie…</span>
                  ) : (
                    <span>{pct}% cached</span>
                  )}
                </span>
                {status && pct < 100 && (
                  <span className="truncate">
                    {status.speedFormatted ? `${status.speedFormatted}` : ''}
                    {status.etaFormatted && status.etaFormatted !== '0s' ? ` • ${status.etaFormatted} left` : ''}
                  </span>
                )}
              </div>
            </div>

            {pollError && <p className="text-[11px] font-mono text-rose-400">{pollError}</p>}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => onReadyRef.current()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Start movie
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl glass px-5 py-3 text-sm font-medium text-white"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}