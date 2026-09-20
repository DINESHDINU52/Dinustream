'use client';

import React, { useState } from 'react';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sliders,
  Play,
  FastForward,
  Volume2,
  Eye,
  History,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const router = useRouter();
  const {
    profile,
    profileId,
    switchProfile,
    settings,
    updateSettings,
    continueWatching,
    myList,
    watchHistory,
    clearWatchHistory,
    removeFromContinueWatching,
    removeFromMyList,
  } = useActiveProfile();

  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'continue' | 'list'>('settings');

  if (!settings) return null;

  const audioOptions = [
    'Dolby Atmos (TrueHD 7.1)',
    'Dolby Digital Plus 5.1',
    'Stereo',
  ] as const;

  const subtitleOptions = [
    'Off',
    'English [CC]',
    'Spanish',
    'French',
  ] as const;

  const qualityOptions = [
    '4K UHD (2160p)',
    '1080p FHD',
    'Auto',
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      kicker="Private Cinema Suite"
      title={`${profile.name}'s Profile & Settings`}
      description="Tailor independent playback preferences, continue watching, watch history, and subtitles."
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Switch profile:</span>
            <button
              onClick={() => switchProfile('dinu')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                profileId === 'dinu'
                  ? 'bg-sky-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Dinu
            </button>
            <button
              onClick={() => switchProfile('kanmani')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                profileId === 'kanmani'
                  ? 'bg-purple-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Kanmani
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div className="p-4 rounded-xl bg-[#0b121e] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <Avatar profile={profile} size="lg" />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0b121e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{profile.name}</h3>
                <Badge variant={profileId === 'dinu' ? 'sync' : 'atmos'} size="sm">
                  {profile.title}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{profile.favoriteGenre}</p>
            </div>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06] overflow-x-auto">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('continue')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'continue'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Continue ({continueWatching.length})
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'list'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              My List ({myList.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({watchHistory.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Autoplay & Skip Automation Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FastForward className="w-3.5 h-3.5 text-sky-400" />
                Playback Automation
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Autoplay next episode */}
                <div className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Autoplay next episode</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically start the subsequent episode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({ autoplayNextEpisode: !settings.autoplayNextEpisode })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      settings.autoplayNextEpisode
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {settings.autoplayNextEpisode ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Auto skip intro */}
                <div className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Auto skip intro</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Skip opening title sequence markers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ autoSkipIntro: !settings.autoSkipIntro })}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      settings.autoSkipIntro
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {settings.autoSkipIntro ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Auto skip recap */}
                <div className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Auto skip recap</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Skip &quot;Previously on...&quot; recap segments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ autoSkipRecap: !settings.autoSkipRecap })}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      settings.autoSkipRecap
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {settings.autoSkipRecap ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Auto skip outro */}
                <div className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Auto skip outro</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Skip credits and jump straight to next.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ autoSkipOutro: !settings.autoSkipOutro })}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      settings.autoSkipOutro
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {settings.autoSkipOutro ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Audio, Subtitles & Quality Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Stream & Audio Preferences
              </h4>

              {/* Default Audio */}
              <div className="p-3.5 rounded-xl bg-[#090e18] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Default audio track</span>
                  <span className="text-[11px] font-mono text-amber-300">{settings.defaultAudio}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {audioOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateSettings({ defaultAudio: opt })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                        settings.defaultAudio === opt
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-black/30 border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Subtitles */}
              <div className="p-3.5 rounded-xl bg-[#090e18] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Default subtitles</span>
                  <span className="text-[11px] font-mono text-sky-300">{settings.defaultSubtitles}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {subtitleOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateSettings({ defaultSubtitles: opt })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                        settings.defaultSubtitles === opt
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : 'bg-black/30 border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Quality & Reduced Motion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Playback Quality */}
                <div className="p-3.5 rounded-xl bg-[#090e18] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Playback quality</span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {settings.playbackQuality}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {qualityOptions.map((q) => (
                      <button
                        key={q}
                        onClick={() => updateSettings({ playbackQuality: q })}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                          settings.playbackQuality === q
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                            : 'bg-black/30 border-white/[0.06] text-slate-400 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div className="p-3.5 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      Reduced motion
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Minimize player and UI transitions for accessibility.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      settings.reducedMotion
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {settings.reducedMotion ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Continue Watching */}
        {activeTab === 'continue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                In-progress titles saved specifically for <strong className="text-white">{profile.name}</strong>.
              </p>
            </div>

            {continueWatching.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#090e18] border border-dashed border-white/10 text-slate-400 text-xs">
                No active in-progress titles for {profile.name}.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {continueWatching.map((item) => {
                  const percent = Math.min(100, Math.round((item.progressMinutes / item.totalMinutes) * 100));
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/[0.16] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          {item.currentEpisodeTitle && (
                            <span className="text-[10px] font-mono text-slate-400">
                              S{item.currentSeasonNumber}:E{item.currentEpisodeNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.progressMinutes}m of {item.totalMinutes}m ({percent}%) • {item.lastWatched}
                        </p>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-sky-400 h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Play className="w-3.5 h-3.5 text-sky-400 fill-current" />}
                          onClick={() => {
                            onClose();
                            router.push(`/watch/${item.id}`);
                          }}
                        >
                          Resume
                        </Button>
                        <button
                          onClick={() => removeFromContinueWatching(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove from Continue Watching"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My List */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Curated screening watchlist for <strong className="text-white">{profile.name}</strong>.
              </p>
            </div>

            {myList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#090e18] border border-dashed border-white/10 text-slate-400 text-xs">
                Your watchlist is empty.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {myList.map((mediaId) => (
                  <div
                    key={mediaId}
                    className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-medium text-white capitalize font-mono">
                      {mediaId.replace(/-/g, ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Play className="w-3.5 h-3.5 text-sky-400 fill-current" />}
                        onClick={() => {
                          onClose();
                          router.push(`/watch/${mediaId}`);
                        }}
                      >
                        Play
                      </Button>
                      <button
                        onClick={() => removeFromMyList(mediaId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove from My List"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Watch History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                History of screened features for <strong className="text-white">{profile.name}</strong>.
              </p>
              {watchHistory.length > 0 && (
                <button
                  onClick={clearWatchHistory}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear History
                </button>
              )}
            </div>

            {watchHistory.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#090e18] border border-dashed border-white/10 text-slate-400 text-xs">
                No watch history recorded for {profile.name}.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {watchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#090e18] border border-white/[0.08] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{item.title}</span>
                        {item.completed && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.progressMinutes}m / {item.totalMinutes}m • {new Date(item.watchedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Play className="w-3.5 h-3.5 text-sky-400 fill-current" />}
                      onClick={() => {
                        onClose();
                        router.push(`/watch/${item.mediaId}`);
                      }}
                    >
                      Replay
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
