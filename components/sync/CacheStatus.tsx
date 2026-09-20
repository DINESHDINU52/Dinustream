'use client';

import React from 'react';
import { SyncState } from '@/lib/api/syncManager';
import { HardDrive, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CacheStatusProps {
  state: SyncState;
  className?: string;
  showIcon?: boolean;
}

export const CacheStatus: React.FC<CacheStatusProps> = ({
  state,
  className,
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'ready':
        return {
          label: 'NVMe Cached',
          sub: 'Instant Playback',
          classes: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'syncing':
        return {
          label: 'Syncing to SSD',
          sub: 'Buffering Stream',
          classes: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
          icon: <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />,
        };
      case 'starting':
        return {
          label: 'Preparing Sync',
          sub: 'Allocating NVMe Block',
          classes: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
        };
      case 'error':
        return {
          label: 'Sync Failed',
          sub: 'Direct Stream Fallback',
          classes: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'not_cached':
      default:
        return {
          label: 'Cloud Master',
          sub: 'Requires SSD Cache',
          classes: 'bg-white/10 border-white/15 text-slate-300',
          icon: <HardDrive className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono backdrop-blur-md',
        config.classes,
        className
      )}
      id="cache-status-badge"
    >
      {showIcon && config.icon}
      <span className="font-semibold">{config.label}</span>
    </div>
  );
};
