'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserProfileId } from '@/types/cinema';
import { useWatchTogether } from '@/hooks/useWatchTogether';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { profileService } from '@/lib/services/profileService';
import { Avatar } from '@/components/ui/Avatar';
import { WatchGroupLobby } from './WatchGroupLobby';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Sparkles, Heart, Lock } from 'lucide-react';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

/** Accepts either a raw group id or a full invite link (?room=<id>) and returns the code. */
function extractRoomCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const room = url.searchParams.get('room');
    if (room) return room;
  } catch {
    /* not a URL — treat the input as the raw code */
  }
  return trimmed;
}

export function WatchGroup() {
  const { profile, switchProfile } = useActiveProfile();
  const profiles = profileService.getAllProfiles();
  const searchParams = useSearchParams();
  const inviteRoom = searchParams.get('room');

  const {
    group,
    createGroup,
    joinGroup,
    selectMovie,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playNext,
    toggleParticipantReady,
    startSyncAndPlay,
    resetGroup,
    addParticipant,
    removeParticipant,
    updateGroupName,
    notifications,
    dismissNotification,
  } = useWatchTogether();

  const [groupNameInput, setGroupNameInput] = useState('Movie Night ❤️');
  const [selectedHost, setSelectedHost] = useState<UserProfileId>(profile.id);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractRoomCode(inviteCode);
    if (!code) return;
    setJoiningCode(true);
    await joinGroup(code, profile.id);
    setJoiningCode(false);
  };

  // Auto-join when arriving via an invite link: /watch-together?room=<groupId>
  useEffect(() => {
    if (DEMO || group || !inviteRoom) return;
    let cancelled = false;
    void joinGroup(inviteRoom, profile.id).then(() => {
      if (!cancelled && !group) {
        // fall through — group appears from the lobby's WS mirror
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteRoom]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGroup(groupNameInput.trim() || 'Movie Night ❤️', selectedHost);
  };

  // If no group is currently active, render the Create Watch Group screen
  if (!group) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <GlassPanel variant="elevated" padding="lg" className="border-white/[0.1] space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/20 text-sky-400 text-xs font-mono">
              <Lock className="w-3.5 h-3.5" />
              Private Synchronized Cinema
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create Watch Group
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start an ultra-low latency synchronized room with Jellyfin SyncPlay.
            </p>
          </div>

          {inviteRoom && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs text-center font-mono">
              Joining room {inviteRoom.slice(0, 8)}…
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Group Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="e.g. Movie Night ❤️"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0d1421] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                />
                <Heart className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Room Host
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profiles.map((p) => {
                  const isSelected = selectedHost === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedHost(p.id)}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                          : 'bg-[#0b111c] border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                        <Avatar profile={p} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">Host</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center mt-2"
              icon={<Sparkles className="w-4 h-4 text-sky-300" />}
            >
              Initialize Screening Room
            </Button>
          </form>

          {/* Join an existing room by invite code */}
          <div className="border-t border-white/[0.08] pt-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Or join an existing room
              </span>
            </div>
            <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste invite code or link"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#0d1421] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={joiningCode || !inviteCode.trim()}
                className="shrink-0"
              >
                {joiningCode ? 'Joining…' : 'Join'}
              </Button>
            </form>
            <p className="text-[11px] text-slate-500 mt-2">
              The host&apos;s invite link contains the room code — paste it here or open the link.
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // Active group exists: render WatchGroupLobby
  return (
    <WatchGroupLobby
      group={group}
      currentUserId={profile.id}
      onSelectMovie={selectMovie}
      onAddToQueue={(movie) => addToQueue(movie, profile.id)}
      onRemoveFromQueue={removeFromQueue}
      onReorderQueue={reorderQueue}
      onClearQueue={clearQueue}
      onPlayNext={playNext}
      onToggleReady={toggleParticipantReady}
      onStartSyncAndPlay={startSyncAndPlay}
      onSwitchProfile={(newId) => profileService.switchProfile(newId)}
      onResetGroup={resetGroup}
      onAddParticipant={addParticipant}
      onRemoveParticipant={removeParticipant}
      onUpdateGroupName={updateGroupName}
      onCreateGroup={createGroup}
      notifications={notifications}
      onDismissNotification={dismissNotification}
    />
  );
}
