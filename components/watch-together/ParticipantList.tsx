'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WatchGroupParticipant } from '@/types/watchTogether';
import { PresenceIndicator } from './PresenceIndicator';
import { Crown, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Image from 'next/image';

interface ParticipantListProps {
  participants: WatchGroupParticipant[];
  currentUserId: 'dinu' | 'kanmani';
  onToggleReady?: (id: 'dinu' | 'kanmani') => void;
  onMakeHost?: (id: 'dinu' | 'kanmani') => void;
}

export function ParticipantList({
  participants,
  currentUserId,
  onToggleReady,
}: ParticipantListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Private Screening Guests ({participants.length}/2)
        </h3>
        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          End-to-End P2P Sync
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p) => {
          const isCurrentUser = p.id === currentUserId;
          const isDinu = p.id === 'dinu';

          return (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.01 }}
              className={`p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                p.isHost
                  ? 'bg-gradient-to-br from-[#121c2e] to-[#0a101d] border-sky-500/30 shadow-[0_4px_20px_rgba(14,165,233,0.12)]'
                  : 'bg-gradient-to-br from-[#101726] to-[#070b14] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {/* Subtle background glow for companion */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 blur-3xl pointer-events-none ${
                  isDinu ? 'bg-sky-500/10' : 'bg-purple-500/10'
                }`}
              />

              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  {/* Avatar with glow ring */}
                  <div className="relative">
                    <div
                      className={`w-11 h-11 rounded-full overflow-hidden border-2 shadow-md ${
                        p.isHost
                          ? 'border-sky-400 shadow-sky-500/30'
                          : isDinu
                          ? 'border-sky-400/60'
                          : 'border-purple-400/60'
                      }`}
                    >
                      <Image
                        src={p.avatarUrl}
                        alt={p.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {p.isHost && (
                      <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-md">
                        <Crown className="w-3 h-3 fill-slate-950" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {p.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          YOU
                        </span>
                      )}
                      {p.isHost && (
                        <Badge variant="atmos" size="sm">
                          HOST
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.statusText}</p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-1.5">
                  <PresenceIndicator
                    isOnline={p.isOnline}
                    isSynced={true}
                    latencyMs={p.syncLatencyMs}
                    size="sm"
                  />

                  {/* Ready Tag or Action */}
                  {onToggleReady && isCurrentUser ? (
                    <button
                      onClick={() => onToggleReady(p.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                        p.isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                      }`}
                    >
                      {p.isReady ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Mark Ready
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        p.isReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {p.isReady ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {p.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
