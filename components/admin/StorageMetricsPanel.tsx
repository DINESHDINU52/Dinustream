'use client';

import React from 'react';
import { SSDStorageMetrics } from '@/types/admin';
import { HardDrive, Film, Tv, Music, Database } from 'lucide-react';

export interface StorageMetricsPanelProps {
  storage: SSDStorageMetrics;
}

export const StorageMetricsPanel: React.FC<StorageMetricsPanelProps> = ({ storage }) => {
  const percentUsed = Number(storage.usedPercentage.toFixed(1));
  const percentFree = Number((100 - percentUsed).toFixed(1));

  const categories = [
    {
      label: '4K UHD Movies',
      sizeGb: storage.breakdown.moviesGb,
      color: 'bg-sky-400',
      textColor: 'text-sky-400',
      icon: Film,
    },
    {
      label: 'Series & Seasons',
      sizeGb: storage.breakdown.seriesGb,
      color: 'bg-indigo-400',
      textColor: 'text-indigo-400',
      icon: Tv,
    },
    {
      label: 'Spatial Audio / Atmos',
      sizeGb: storage.breakdown.spatialAudioGb,
      color: 'bg-amber-400',
      textColor: 'text-amber-400',
      icon: Music,
    },
    {
      label: 'Temp NVMe Cache',
      sizeGb: storage.breakdown.systemBufferGb,
      color: 'bg-slate-500',
      textColor: 'text-slate-400',
      icon: Database,
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0a0f1d]/90 to-[#070b13]/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/20 text-sky-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Oracle NVMe SSD Storage</h3>
            <p className="text-[11px] text-slate-400">Direct PCIe 4.0 Local Cache for Instant Atmos Screening</p>
          </div>
        </div>

        {/* Primary Metric Badges: Total, Used, Free */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Total</span>
            <span className="font-bold text-white">{storage.totalGb.toLocaleString()} GB</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-400/20 text-center">
            <span className="text-[10px] text-sky-300 block uppercase">Used</span>
            <span className="font-bold text-sky-400">{storage.usedGb.toLocaleString()} GB</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-center">
            <span className="text-[10px] text-emerald-300 block uppercase">Free</span>
            <span className="font-bold text-emerald-400">{storage.freeGb.toLocaleString()} GB</span>
          </div>
        </div>
      </div>

      {/* Storage Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>{percentUsed}% Used ({storage.usedGb} GB)</span>
          <span className="text-emerald-400">{percentFree}% Available ({storage.freeGb} GB)</span>
        </div>

        <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden flex p-0.5 border border-white/[0.08]">
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.label}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <Icon className={`w-3.5 h-3.5 ${cat.textColor}`} />
                <span className="text-[11px] text-slate-300 truncate">{cat.label}</span>
              </div>
              <p className="text-sm font-bold font-mono text-white pl-4">
                {cat.sizeGb} <span className="text-[10px] text-slate-500 font-normal">GB</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
