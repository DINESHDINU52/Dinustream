'use client';

import React, { useState } from 'react';
import { UserProfileId } from '@/types/cinema';
import { useWatchTogether } from '@/hooks/useWatchTogether';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { profileService } from '@/lib/services/profileService';
import { Avatar } from '@/components/ui/Avatar';
import { WatchGroupLobby } from './WatchGroupLobby';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Sparkles, Heart, Lock } from 'lucide-react';

export function WatchGroup() {
  const { profile, switchProfile } = useActiveProfile();
  const profiles = profileService.getAllProfiles();
  const {
    group,
    createGroup,
    selectMovie,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playNext,
    toggleParticipantReady,
    startSyncAndPlay,
    resetGroup,
  } = useWatchTogether();

  const [groupNameInput, setGroupNameInput] = useState('Movie Night ❤️');
  const [selectedHost, setSelectedHost] = useState<UserProfileId>(profile.id);

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
      onSwitchProfile={() => switchProfile()}
      onResetGroup={resetGroup}
    />
  );
}
