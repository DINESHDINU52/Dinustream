'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncStatusResponse, getSyncStatus } from '@/lib/api/syncManager';
import { X, AlertCircle, CheckCircle2, Loader2, Play } from 'lucide-react';

export interface SyncOverlayProps {
  movie: MediaItem;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
  onReady: (status: SyncStatusResponse) => void;
  isGroupMode?: boolean;
}

/** Synthetic "ready" status used when the caller skips ahead manually. */
function syntheticReadyStatus(filename: string): SyncStatusResponse {
  return {
    filename,
    state: 'ready',
    percentage: 100,
    transferredBytes: 0,
    totalBytes: 0,
    transferredFormatted: '—',
    totalFormatted: '—',
    speedBytesPerSec: 0,
    speedFormatted: '—',
    etaSeconds: 0,
    etaFormatted: '0s',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Cache-sync progress screen.
 *
 * Previously this rendered the Dolby Atmos prelude full-screen and advanced to
 * the feature when *the prelude clip* finished — not when the sync actually
 * completed. That coupling was backwards: a 20-second clip decided when a
 * multi-gigabyte transfer was "done", and if the browser blocked the clip's
 * autoplay (which it does, because the clip had sound) the overlay never
 * advanced at all.
 *
 * It now shows the title's own artwork with real transfer progress and advances
 * when the sync manager reports `ready`.
 */
export const SyncOverlay: React.FC<SyncOverlayProps> = ({
  movie,
  filename,
  isOpen,
  onClose,
  onReady,
  isGroupMode = false,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const isReadyRef = useRef(false);

  /* Latest callback in a ref so the poll loop is not rebuilt on every render. */
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const checkStatus = useCallback(async () => {
    try {
      const data = await getSyncStatus(filename);
      setSyncStatus(data);
      setPollError(null);

      // Advance on real readiness, not on a timer or a video ending.
      if (!isReadyRef.current && (data.state === 'ready' || data.percentage >= 100)) {
        isReadyRef.current = true;
        onReadyRef.current(data);
      }
    } catch (err) {
      setPollError((err as Error).message || 'Failed to poll sync status');
    }
  }, [filename]);

  useEffect(() => {
    if (!isOpen) {
      isReadyRef.current = false;
      return;
    }

    // Deferred so the first setState does not run in the effect body.
    const initialTimer = setTimeout(checkStatus, 0);
    // 600ms was tuned for a progress bar racing a video; 1s is plenty and a
    // third of the requests.
    const interval = setInterval(() => {
      if (!isReadyRef.current) void checkStatus();
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isOpen, checkStatus]);

  if (!isOpen) return null;

  const percentage = Math.min(100, Math.max(0, syncStatus?.percentage ?? 0));
  const isComplete = percentage >= 100 || syncStatus?.state === 'ready';
  const artwork = movie.backdropUrl || movie.posterUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black select-none overflow-hidden"
        id="dinu-sync-overlay"
      >
        {/* Title artwork, heavily dimmed so the progress copy stays readable */}
        {artwork && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={artwork}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-md space-y-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-300">
                {isGroupMode ? 'Preparing group screening' : 'Preparing your stream'}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
                {movie.title}
              </h2>
            </div>

            {/* Transfer progress */}
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400"
                  animate={{ width: `${percentage}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  {isComplete ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Ready</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                      <span>{percentage}%</span>
                    </>
                  )}
                </span>
                {syncStatus && !isComplete && (
                  <span className="truncate">
                    {syncStatus.transferredFormatted} / {syncStatus.totalFormatted}
                    {syncStatus.speedFormatted ? ` • ${syncStatus.speedFormatted}` : ''}
                    {syncStatus.etaFormatted ? ` • ${syncStatus.etaFormatted} left` : ''}
                  </span>
                )}
              </div>
            </div>

            {/*
              Skip straight to playback. Useful because the stream is playable
              well before the cache copy finishes — Jellyfin can serve it
              directly while the transfer continues in the background.
            */}
            <button
              onClick={() => onReady(syncStatus ?? syntheticReadyStatus(filename))}
              className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform active:scale-95 cinema-focus"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{isComplete ? 'Play now' : 'Start without waiting'}</span>
            </button>
          </div>
        </div>

        {/* Close */}
        <div className="absolute top-4 right-4 z-20 pt-safe-flush">
          <button
            onClick={onClose}
            className="rounded-full glass p-2.5 text-slate-300 transition-colors hover:text-white cinema-focus"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isGroupMode && (
          <div className="absolute top-4 left-4 z-20 pt-safe-flush rounded-full glass px-3.5 py-1.5 text-xs font-medium text-cyan-300">
            Group Sync Active
          </div>
        )}

        {pollError && (
          <div className="absolute bottom-6 inset-x-4 mx-auto max-w-md z-20 flex items-center justify-center gap-2 rounded-full bg-rose-950/90 border border-rose-500/40 px-3 py-2.5 text-xs text-rose-200 backdrop-blur-2xl">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span className="truncate">{pollError}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
