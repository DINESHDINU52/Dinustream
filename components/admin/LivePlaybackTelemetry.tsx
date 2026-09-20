'use client';

import React from 'react';
import { ActivePlaybackTelemetry } from '@/types/admin';
import { Users, Film, Radio, Check, Laptop, Tablet, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LivePlaybackTelemetryProps {
  playback: ActivePlaybackTelemetry | null;
}

export const LivePlaybackTelemetry: React.FC<LivePlaybackTelemetryProps> = ({ playback }) => {
  if (!playback) {
    return (
      <div className="p-5 rounded-2xl bg-[#090e17]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl text-center py-10 space-y-2">
        <Film className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">No Active Screening</h4>
        <p className="text-xs text-slate-500">
          Neither Dinu nor Kanmani is currently streaming media.
        </p>
      </div>
    );
  }

  const formatSec = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.min(
    100,
    (playback.currentTimeSec / playback.durationSec) * 100
  );

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0a1120]/90 to-[#070b13]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Live Screening Telemetry
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                STREAMING
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Group: <span className="text-white font-medium">{playback.groupName}</span> • Authoritative Sync
            </p>
          </div>
        </div>

        {/* Sync Drift Metric */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">SyncPlay Drift:</span>
          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 font-bold">
            ±8ms (Lock)
          </span>
        </div>
      </div>

      {/* Main Screening Info Card */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playback.posterUrl}
          alt={playback.title}
          className="w-16 h-22 rounded-lg object-cover border border-white/10 shadow-lg shrink-0"
        />

        <div className="flex-1 w-full space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 className="text-base font-bold text-white tracking-tight">{playback.title}</h4>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-sky-400 font-semibold">{playback.bitrateMbps} Mbps</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{playback.resolution}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_#38bdf8]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{formatSec(playback.currentTimeSec)}</span>
              <span className="text-amber-300">{playback.audioTrack}</span>
              <span>{formatSec(playback.durationSec)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Participants Breakdown */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
          Active Participants ({playback.participants.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playback.participants.map((user) => (
            <div
              key={user.id}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={cn(
                    'w-8 h-8 rounded-full object-cover border-2',
                    user.id === 'dinu' ? 'border-sky-400' : 'border-rose-400'
                  )}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{user.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[140px]">
                    {user.device}
                  </span>
                </div>
              </div>

              <div className="text-right text-xs font-mono">
                <span className="text-emerald-400 font-bold block">
                  {user.driftMs === 0 ? 'Leader' : `+${user.driftMs}ms`}
                </span>
                <span className="text-[10px] text-slate-500">Synced</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
