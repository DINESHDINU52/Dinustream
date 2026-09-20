'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SyncPlaybackSession,
  SyncActionNotification,
  ParticipantPresence,
} from '@/types/syncPlayback';

interface SyncWatchOverlayProps {
  session: SyncPlaybackSession | null;
  isVisible: boolean; // Managed by player controls auto-fade
  notification: SyncActionNotification | null;
  driftMs?: number;
}

export function SyncWatchOverlay({
  session,
  isVisible,
  notification,
  driftMs = 18,
}: SyncWatchOverlayProps) {
  if (!session) return null;

  const getPresenceColor = (presence: ParticipantPresence) => {
    switch (presence) {
      case 'Watching':
      case 'Online':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      case 'Paused':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      case 'Buffering':
        return 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse';
      case 'Offline':
      default:
        return 'bg-slate-600';
    }
  };

  const dinu = session.participants.dinu;
  const kanmani = session.participants.kanmani;

  return (
    <>
      {/* 1. Subtle Notification Pill (Top-Center Floating) */}
      <div className="absolute top-6 inset-x-0 flex justify-center z-40 pointer-events-none px-4">
        <AnimatePresence mode="wait">
          {notification && (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="px-4 py-2 rounded-full bg-[#0a101d]/90 backdrop-blur-md border border-white/[0.14] shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-100 tracking-wide">
                {notification.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Compact Watch Together Presence Overlay (Top-Right Floating) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="absolute top-6 right-6 z-30 pointer-events-auto"
          >
            <div className="p-3 rounded-2xl bg-[#070b13]/85 backdrop-blur-md border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.7)] min-w-[190px] space-y-2.5">
              {/* Group Title */}
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span>🍿</span>
                  <span>{session.groupName || 'Movie Night ❤️'}</span>
                </div>
              </div>

              {/* Participants Presence */}
              <div className="space-y-1.5 text-[11px] font-mono">
                {/* Dinu */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Dinu</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{dinu.presence}</span>
                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${getPresenceColor(
                        dinu.presence
                      )}`}
                    />
                  </div>
                </div>

                {/* Kanmani */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Kanmani</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{kanmani.presence}</span>
                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${getPresenceColor(
                        kanmani.presence
                      )}`}
                    />
                  </div>
                </div>
              </div>

              {/* Synced Status Footer */}
              <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
                  <span>Synced</span>
                </div>
                <span className="text-slate-500">±{driftMs}ms</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
