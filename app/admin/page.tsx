'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { SystemHealthGauges } from '@/components/admin/SystemHealthGauges';
import { StorageMetricsPanel } from '@/components/admin/StorageMetricsPanel';
import { CacheManagerTable } from '@/components/admin/CacheManagerTable';
import { SyncJobsTracker } from '@/components/admin/SyncJobsTracker';
import { LivePlaybackTelemetry } from '@/components/admin/LivePlaybackTelemetry';
import { adminService } from '@/lib/services/adminService';
import { listCachedFiles, deleteCachedFile } from '@/lib/api/syncManager';
import { AdminTelemetrySummary, CachedMedia } from '@/types/admin';
import { ShieldCheck, RefreshCw, Server } from 'lucide-react';

/** "Dune.2021.2160p.mkv" -> "Dune 2021 2160p". */
function prettyTitle(filename: string): string {
  return filename.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[._]+/g, ' ').trim() || filename;
}

/**
 * Map one real cached file (from the Sync Manager) onto the table's row shape.
 * Resolution / audio are unknown from the filename, so they show as "—"; the
 * filename is the identity used for delete.
 */
function toCachedMedia(file: {
  filename: string;
  kind: 'movie' | 'show';
  sizeBytes: number;
  modifiedAt: string;
}): CachedMedia {
  let when = '—';
  if (file.modifiedAt) {
    const d = new Date(file.modifiedAt);
    if (!Number.isNaN(d.getTime())) when = d.toLocaleString();
  }
  const isShow = file.kind === 'show';
  return {
    id: file.filename,
    title: prettyTitle(file.filename),
    mediaType: isShow ? 'series' : 'movie',
    sizeGb: Number((file.sizeBytes / 1e9).toFixed(2)),
    resolution: '—',
    audioFormat: '—',
    cachedAt: when,
    lastAccessed: when,
    posterUrl: '',
    cacheLocation: `/opt/dinustream/cache/${isShow ? 'shows' : 'movies'}/${file.filename}`,
  };
}

export default function AdminPage() {
  const [telemetry, setTelemetry] = useState<AdminTelemetrySummary>(() =>
    adminService.getTelemetry()
  );
  // Real SSD cache inventory (list + delete via the Python Sync Manager).
  const [cachedMedia, setCachedMedia] = useState<CachedMedia[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCache = useCallback(async () => {
    const files = await listCachedFiles();
    setCachedMedia(files.map(toCachedMedia));
  }, []);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setTelemetry(adminService.getTelemetry());
    });
    void loadCache();
    return () => unsubscribe();
  }, [loadCache]);

  /* Clear the spinner timer on unmount so it cannot fire against a
     torn-down component. */
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTelemetry(adminService.getTelemetry());
    void loadCache();
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleRemoveFromCache = async (id: string) => {
    // id is the on-disk filename for real cache entries.
    const entry = cachedMedia.find((m) => m.id === id);
    const kind: 'movie' | 'show' =
      entry?.mediaType === 'series' || entry?.mediaType === 'episode' ? 'show' : 'movie';
    await deleteCachedFile(id, kind);
    await loadCache();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-navbar pb-16 space-y-8">
          {/* Dashboard header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-start gap-3 min-w-0">
              <span className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-400 shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <div className="min-w-0">
                {/* `flex-wrap` so the access badge drops below the title instead
                    of forcing horizontal overflow on a phone. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    DinuStream Operations Center
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 uppercase tracking-wider font-semibold">
                    Dinu Master Access
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Live Oracle Cloud infrastructure, NVMe SSD cache, Sync Manager pipeline &amp;
                  SyncPlay telemetry.
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="w-full lg:w-auto justify-center px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-2 cinema-focus"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
                />
                <span>Refresh Telemetry</span>
              </button>
            </div>
          </div>

          {/* 1. Core services health */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400 shrink-0" />
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
              cachedMedia={cachedMedia}
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
