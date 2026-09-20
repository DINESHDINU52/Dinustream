'use client';

import React from 'react';
import { SyncStatusResponse } from '@/lib/api/syncManager';
import { motion } from 'framer-motion';
import { HardDrive, Zap, Clock, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SyncProgressProps {
  status: SyncStatusResponse;
  className?: string;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  status,
  className,
}) => {
  const isComplete = status.state === 'ready' || status.percentage >= 100;

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl bg-[#090e1a]/95 border border-slate-400/[0.18] shadow-2xl backdrop-blur-2xl space-y-4 text-slate-100',
        className
      )}
      id="sync-progress-container"
    >
      {/* Header: Title & Percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
            Oracle NVMe SSD Cache
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% READY
            </span>
          ) : (
            <span className="text-sm font-mono font-bold text-sky-400">
              {status.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* High-Precision Animated Progress Track */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, status.percentage)}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />
      </div>

      {/* Metrics Grid: Progress %, Transferred, Total, Speed, ETA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs font-mono">
        {/* Metric 1: Transferred / Total */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide">
            <ArrowDownToLine className="w-3 h-3 text-sky-400" />
            <span>Transferred</span>
          </div>
          <p className="font-semibold text-slate-200">
            {status.transferredFormatted}
            <span className="text-slate-500 font-normal"> / {status.totalFormatted}</span>
          </p>
        </div>

        {/* Metric 2: Speed */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Speed</span>
          </div>
          <p className="font-semibold text-slate-200">{status.speedFormatted}</p>
        </div>

        {/* Metric 3: ETA */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>ETA</span>
          </div>
          <p className="font-semibold text-slate-200">{status.etaFormatted}</p>
        </div>

        {/* Metric 4: Status / State */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span>State</span>
          </div>
          <p className="font-semibold text-sky-300 capitalize">{status.state.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
};
