'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncStatusResponse, getSyncStatus } from '@/lib/api/syncManager';
import { SyncProgress } from './SyncProgress';
import { AtmosIntro } from '@/components/player/AtmosIntro';
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

  // Poll sync status every 600ms
  const checkStatus = useCallback(async () => {
    try {
      const data = await getSyncStatus(filename);
      setSyncStatus(data);
      setPollError(null);

      if ((data.state === 'ready' || data.percentage >= 100) && !isReadyRef.current) {
        isReadyRef.current = true;
        // Brief pause to allow the user to see the 100% completion state
        setTimeout(() => {
          onReady(data);
        }, 800);
      }
    } catch (err) {
      setPollError((err as Error).message || 'Failed to poll sync status');
    }
  }, [filename, onReady]);

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
        {/* Background Atmos Cinematic Experience */}
        <AtmosIntro
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
            if (syncStatus && (syncStatus.state === 'ready' || syncStatus.percentage >= 100)) {
              onReady(syncStatus);
            }
          }}
          onSkip={() => {
            // User manually skips waiting, proceeds directly
            if (syncStatus) {
              onReady(syncStatus);
            }
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
