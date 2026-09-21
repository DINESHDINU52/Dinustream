'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncStatusResponse, getSyncStatus } from '@/lib/api/syncManager';
import { AtmosIntro } from '@/components/player/AtmosIntro';
import { useDolbyIntroPreference } from '@/hooks/useDolbyIntroPreference';
import { X, AlertCircle } from 'lucide-react';

export interface SyncOverlayProps {
  movie: MediaItem;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
  onReady: (status: SyncStatusResponse) => void;
  isGroupMode?: boolean;
}

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
  const { isDolbyIntroEnabled, setDolbyIntroEnabled } = useDolbyIntroPreference();

  // Poll sync status in background without cutting video playback
  const checkStatus = useCallback(async () => {
    try {
      const data = await getSyncStatus(filename);
      setSyncStatus(data);
      setPollError(null);
    } catch (err) {
      setPollError((err as Error).message || 'Failed to poll sync status');
    }
  }, [filename]);

  useEffect(() => {
    if (!isOpen) {
      isReadyRef.current = false;
      return;
    }

    // Initial check deferred to avoid synchronous setState in effect
    const initialTimer = setTimeout(() => {
      checkStatus();
    }, 0);

    const interval = setInterval(() => {
      if (!isReadyRef.current) {
        checkStatus();
      }
    }, 600);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isOpen, checkStatus]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden"
        id="dinu-sync-overlay"
      >
        {/*
          Atmos prelude while the cache sync runs.

          `autoFullscreen` is off here and no fullscreen toggle is passed: this
          overlay is already `fixed inset-0`, so it covers the viewport on its
          own, and requesting OS fullscreen for a transient sync screen would
          leave the viewer in fullscreen after it dismisses. The prelude's own
          play/pause, volume and enable/disable settings are still available.
        */}
        <AtmosIntro
          autoFullscreen={false}
          isIntroEnabled={isDolbyIntroEnabled}
          onSetIntroEnabled={setDolbyIntroEnabled}
          movie={movie}
          syncProgress={
            syncStatus
              ? {
                  status: syncStatus.state === 'ready' ? 'ready' : 'syncing',
                  percentage: syncStatus.percentage,
                  speedMbps: syncStatus.speedBytesPerSec
                    ? Math.round(syncStatus.speedBytesPerSec / (1024 * 1024))
                    : 148,
                  etaSeconds: syncStatus.etaSeconds,
                }
              : undefined
          }
          onReady={() => {
            // When the spatial video naturally finishes playing, proceed to movie
            onReady(syncStatus || {
              filename,
              state: 'ready',
              percentage: 100,
              transferredBytes: 4294967296,
              totalBytes: 4294967296,
              transferredFormatted: '4.3 GB',
              totalFormatted: '4.3 GB',
              speedBytesPerSec: 155189248,
              speedFormatted: '148 MB/s',
              etaSeconds: 0,
              etaFormatted: '0s',
              updatedAt: new Date().toISOString(),
            });
          }}
          onSkip={() => {
            // When user clicks the Skip button, proceed directly to movie
            onReady(syncStatus || {
              filename,
              state: 'ready',
              percentage: 100,
              transferredBytes: 4294967296,
              totalBytes: 4294967296,
              transferredFormatted: '4.3 GB',
              totalFormatted: '4.3 GB',
              speedBytesPerSec: 155189248,
              speedFormatted: '148 MB/s',
              etaSeconds: 0,
              etaFormatted: '0s',
              updatedAt: new Date().toISOString(),
            });
          }}
        />

        {/* Top Floating Controls */}
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-colors cinema-focus"
            aria-label="Close sync modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Group Sync Indicator if in Watch Together mode */}
        {isGroupMode && (
          <div className="absolute top-6 left-6 z-50 text-xs font-medium text-cyan-300 bg-white/[0.08] border border-white/[0.15] rounded-full py-1 px-3.5 backdrop-blur-2xl shadow-lg">
            Group Sync Active
          </div>
        )}

        {pollError && (
          <div className="absolute bottom-6 inset-x-4 max-w-md mx-auto z-40 p-2.5 rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-center gap-2 backdrop-blur-2xl">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{pollError}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
