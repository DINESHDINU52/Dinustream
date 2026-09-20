'use client';

import React from 'react';
import { ServiceTelemetry } from '@/types/admin';
import { Server, HardDriveDownload, Cloud, MessageSquare, CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SystemHealthGaugesProps {
  jellyfin: ServiceTelemetry;
  syncManager: ServiceTelemetry;
  googleDrive: ServiceTelemetry;
  firebase: ServiceTelemetry;
}

export const SystemHealthGauges: React.FC<SystemHealthGaugesProps> = ({
  jellyfin,
  syncManager,
  googleDrive,
  firebase,
}) => {
  const services = [
    {
      telemetry: jellyfin,
      icon: Server,
      accent: 'text-indigo-400',
      borderGlow: 'border-indigo-500/20 hover:border-indigo-500/40',
      bgGlow: 'from-indigo-950/20',
    },
    {
      telemetry: syncManager,
      icon: HardDriveDownload,
      accent: 'text-sky-400',
      borderGlow: 'border-sky-500/20 hover:border-sky-500/40',
      bgGlow: 'from-sky-950/20',
    },
    {
      telemetry: googleDrive,
      icon: Cloud,
      accent: 'text-emerald-400',
      borderGlow: 'border-emerald-500/20 hover:border-emerald-500/40',
      bgGlow: 'from-emerald-950/20',
    },
    {
      telemetry: firebase,
      icon: MessageSquare,
      accent: 'text-amber-400',
      borderGlow: 'border-amber-500/20 hover:border-amber-500/40',
      bgGlow: 'from-amber-950/20',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case 'syncing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            SYNCING
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            DEGRADED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-2.5 h-2.5" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {services.map(({ telemetry, icon: Icon, accent, borderGlow, bgGlow }) => (
        <div
          key={telemetry.name}
          className={cn(
            'p-4 rounded-xl bg-gradient-to-b via-[#090e17]/80 to-[#070b13]/95 border transition-all duration-300 backdrop-blur-xl group hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            borderGlow,
            bgGlow
          )}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Icon className={cn('w-4 h-4', accent)} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-tight">{telemetry.name}</h4>
                <p className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                  {telemetry.endpoint}
                </p>
              </div>
            </div>
            {getStatusBadge(telemetry.status)}
          </div>

          {/* Telemetry Metrics */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-400">
              <Activity className="w-3 h-3 text-slate-500" />
              <span>{telemetry.latencyMs}ms</span>
            </div>
            <span className="text-[10px] text-slate-400">Uptime: {telemetry.uptime}</span>
          </div>

          {/* Details / Capabilities */}
          <p className="text-[11px] text-slate-400 mt-2 font-sans line-clamp-1 leading-relaxed">
            {telemetry.details}
          </p>
        </div>
      ))}
    </div>
  );
};
