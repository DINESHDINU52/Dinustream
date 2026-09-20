'use client';

import React, { useState, useEffect } from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { SystemHealthGauges } from '@/components/admin/SystemHealthGauges';
import { StorageMetricsPanel } from '@/components/admin/StorageMetricsPanel';
import { CacheManagerTable } from '@/components/admin/CacheManagerTable';
import { SyncJobsTracker } from '@/components/admin/SyncJobsTracker';
import { LivePlaybackTelemetry } from '@/components/admin/LivePlaybackTelemetry';
import { adminService } from '@/lib/services/adminService';
import { AdminTelemetrySummary } from '@/types/admin';
import { ShieldCheck, RefreshCw, Cpu, Server } from 'lucide-react';

export default function AdminPage() {
  const [telemetry, setTelemetry] = useState<AdminTelemetrySummary>(() =>
    adminService.getTelemetry()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setTelemetry(adminService.getTelemetry());
    });
    return () => unsubscribe();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTelemetry(adminService.getTelemetry());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleRemoveFromCache = (id: string) => {
    adminService.removeCachedMedia(id);
  };

  const handleRetryJob = (id: string) => {
    adminService.retrySyncJob(id);
  };

  const handleTriggerNewSync = (title: string, sizeGb: number) => {
    adminService.queueNewSync(title, sizeGb);
  };

  return (
    <CinemaShell>
      <AdminGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-28 pb-16 space-y-8">
          {/* Dashboard Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      DinuStream Operations Center
                    </h1>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 uppercase tracking-wider font-semibold">
                      Dinu Master Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Live Oracle Cloud infrastructure, NVMe SSD cache, Sync Manager pipeline & SyncPlay telemetry.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-2 cinema-focus"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
                <span>Refresh Telemetry</span>
              </button>
            </div>
          </div>

          {/* 1. Core Services Health (Jellyfin, Sync Manager, Google Drive, Firebase) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                Core Subsystems Health
              </h2>
              <span className="text-[10px] font-mono text-emerald-400">
                All Systems Operational
              </span>
            </div>
            <SystemHealthGauges
              jellyfin={telemetry.jellyfin}
              syncManager={telemetry.syncManager}
              googleDrive={telemetry.googleDrive}
              firebase={telemetry.firebase}
            />
          </section>

          {/* 2. Storage Metrics & Live Screening Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StorageMetricsPanel storage={telemetry.storage} />
            <LivePlaybackTelemetry playback={telemetry.livePlayback} />
          </div>

          {/* 3. Cache Manager (Cached Media, Sizes, Remove Action) */}
          <section className="space-y-3">
            <CacheManagerTable
              cachedMedia={telemetry.cachedMedia}
              onRemoveFromCache={handleRemoveFromCache}
            />
          </section>

          {/* 4. Sync Jobs Pipeline (Queued, Syncing, Completed, Failed) */}
          <section className="space-y-3">
            <SyncJobsTracker
              syncJobs={telemetry.syncJobs}
              onRetryJob={handleRetryJob}
              onTriggerNewSync={handleTriggerNewSync}
            />
          </section>
        </div>
      </AdminGuard>
    </CinemaShell>
  );
}
