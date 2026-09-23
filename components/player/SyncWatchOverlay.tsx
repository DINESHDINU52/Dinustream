import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SyncPlaybackSession,
  SyncActionNotification,
  ParticipantPresence,
} from '@/types/syncPlayback';
import { Crown, Lock, Globe } from 'lucide-react';

interface SyncWatchOverlayProps {
  session: SyncPlaybackSession | null;
  isVisible: boolean; // Managed by player controls auto-fade
  notification: SyncActionNotification | null;
  driftMs?: number;
  currentUserId?: string;
  onToggleControlMode?: (newMode: 'HOST_ONLY' | 'EVERYONE') => void;
}

export function SyncWatchOverlay({
  session,
  isVisible,
  notification,
  driftMs = 18,
  currentUserId,
  onToggleControlMode,
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

  const participantEntries = Object.entries(session.participants || {});
  const isHost = Boolean(
    (currentUserId && session.hostId === currentUserId) ||
      (currentUserId && session.participants?.[currentUserId]?.isHost)
  );
  const controlMode = session.controlMode || 'EVERYONE';

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
              className="px-4 py-2 rounded-full bg-[#0a101d]/90 backdrop-blur-md border border-white/[0.14] shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5 pointer-events-auto"
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
            <div className="p-3.5 rounded-2xl bg-[#070b13]/90 backdrop-blur-md border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.7)] min-w-[210px] space-y-2.5">
              {/* Group Title */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span>🍿</span>
                  <span className="truncate max-w-[130px]">{session.groupName || 'Movie Night ❤️'}</span>
                </div>
                {controlMode === 'HOST_ONLY' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    <Lock className="w-2.5 h-2.5" />
                    Host Only
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                    <Globe className="w-2.5 h-2.5" />
                    Open
                  </span>
                )}
              </div>

              {/* Host Control Mode Switcher (Visible to Host) */}
              {isHost && onToggleControlMode && (
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 font-semibold">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Host Controls
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-bold tracking-wider">
                    <button
                      type="button"
                      onClick={() => onToggleControlMode('HOST_ONLY')}
                      className={`py-1 rounded flex items-center justify-center gap-1 transition-all ${
                        controlMode === 'HOST_ONLY'
                          ? 'bg-amber-500 text-black shadow-sm font-black'
                          : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      Host Only
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleControlMode('EVERYONE')}
                      className={`py-1 rounded flex items-center justify-center gap-1 transition-all ${
                        controlMode === 'EVERYONE'
                          ? 'bg-emerald-500 text-black shadow-sm font-black'
                          : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Globe className="w-2.5 h-2.5" />
                      Everyone
                    </button>
                  </div>
                </div>
              )}

              {/* Non-host locked status notice */}
              {!isHost && controlMode === 'HOST_ONLY' && (
                <div className="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[10px] text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span>Playback control locked by host</span>
                </div>
              )}

              {/* Participants Presence */}
              <div className="space-y-1.5 text-[11px] font-mono">
                {participantEntries.length > 0 ? (
                  participantEntries.map(([pId, participant]) => {
                    const presence = participant?.presence || 'Online';
                    const name = participant?.name || (pId.charAt(0).toUpperCase() + pId.slice(1));
                    const isParticipantHost =
                      participant?.isHost || pId === session.hostId;

                    return (
                      <div key={pId} className="flex items-center justify-between">
                        <div className="flex items-center gap-1 max-w-[120px]">
                          {isParticipantHost && (
                            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="text-slate-300 font-medium truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">{presence}</span>
                          <span
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${getPresenceColor(
                              presence
                            )}`}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Screening Room</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-400">Active</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Synced Status Footer */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
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
