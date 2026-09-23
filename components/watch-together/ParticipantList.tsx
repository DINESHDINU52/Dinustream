'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfileId } from '@/types/cinema';
import { WatchGroupParticipant } from '@/types/watchTogether';
import { PresenceIndicator } from './PresenceIndicator';
import {
  Crown,
  CheckCircle2,
  Clock,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { profileService } from '@/lib/services/profileService';
import { Avatar } from '@/components/ui/Avatar';

interface ParticipantListProps {
  participants: WatchGroupParticipant[];
  currentUserId: UserProfileId;
  isHost?: boolean;
  roomId?: string;
  onToggleReady?: (id: UserProfileId) => void;
  onMakeHost?: (id: UserProfileId) => void;
  onAddParticipant?: (id: UserProfileId) => void;
  onRemoveParticipant?: (id: UserProfileId) => void;
}

export function ParticipantList({
  participants,
  currentUserId,
  isHost,
  roomId = 'group-movie-night',
  onToggleReady,
  onMakeHost,
  onAddParticipant,
  onRemoveParticipant,
}: ParticipantListProps) {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const allProfiles = profileService.getAllProfiles();
  const joinedIds = new Set(participants.map((p) => p.id));
  const availableToAdd = allProfiles.filter((p) => !joinedIds.has(p.id));

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/watch-together?room=${encodeURIComponent(roomId)}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Add User and Invite Action */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Private Screening Guests ({participants.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy invite link to clipboard"
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-sky-400" />
                <span>Invite Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white transition-all font-semibold"
          >
            <UserPlus className="w-3 h-3 text-rose-400" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Grid of Joined Participants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {participants.map((p) => {
          const isCurrentUser = p.id === currentUserId;

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
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar with glow ring */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full overflow-hidden border-2 shadow-md ${
                        p.isHost
                          ? 'border-sky-400 shadow-sky-500/30'
                          : 'border-white/20'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.avatarUrl || '/avatars/characters/iron-man.svg'}
                        alt={p.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    {p.isHost && (
                      <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-md">
                        <Crown className="w-3 h-3 fill-slate-950" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-white text-sm truncate">
                        {p.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          YOU
                        </span>
                      )}
                      {p.isHost && (
                        <Badge variant="atmos" size="sm">
                          HOST
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {p.statusText || (p.isHost ? 'Host • Screening Room' : 'Connected')}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <PresenceIndicator
                      isOnline={p.isOnline}
                      isSynced={true}
                      latencyMs={p.syncLatencyMs}
                      size="sm"
                    />
                    {isHost && !p.isHost && onRemoveParticipant && (
                      <button
                        type="button"
                        onClick={() => onRemoveParticipant(p.id)}
                        title="Remove user from room"
                        className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ready Tag or Action */}
                  {onToggleReady && isCurrentUser ? (
                    <button
                      type="button"
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
                        p.isReady ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {p.isReady ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Ready
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-slate-500" />
                          Not Ready
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121620] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Add User to Screening</h4>
                    <p className="text-xs text-neutral-400">Invite a cinema member or copy room link</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shareable Invite Link Section */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 block uppercase">
                  Room Invite Link
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/watch-together?room=${encodeURIComponent(roomId)}`
                        : ''
                    }
                    className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Available Profiles to Add Directly */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-300 block">
                  Available Cinema Profiles ({availableToAdd.length})
                </span>

                {availableToAdd.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {availableToAdd.map((prof) => (
                      <div
                        key={prof.id}
                        className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prof.avatarUrl || '/avatars/characters/iron-man.svg'}
                              alt={prof.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-white truncate block">
                              {prof.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate block">
                              {prof.title || 'Cinema Member'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onAddParticipant?.(prof.id);
                            setIsAddUserOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-4 bg-black/20 rounded-xl">
                    All cinema profiles are already in this room!
                  </p>
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
