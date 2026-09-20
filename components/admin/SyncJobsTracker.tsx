'use client';

import React, { useState } from 'react';
import { SyncJob, SyncJobStatus } from '@/types/admin';
import { RefreshCw, Play, CheckCircle2, XCircle, Clock, ArrowUpRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SyncJobsTrackerProps {
  syncJobs: SyncJob[];
  onRetryJob: (id: string) => void;
  onTriggerNewSync: (title: string, sizeGb: number) => void;
}

export const SyncJobsTracker: React.FC<SyncJobsTrackerProps> = ({
  syncJobs,
  onRetryJob,
  onTriggerNewSync,
}) => {
  const [filter, setFilter] = useState<SyncJobStatus | 'all'>('all');
  const [isNewSyncModalOpen, setIsNewSyncModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSize, setNewSize] = useState('65');

  const filteredJobs = syncJobs.filter((job) => (filter === 'all' ? true : job.status === filter));

  const counts = {
    all: syncJobs.length,
    queued: syncJobs.filter((j) => j.status === 'queued').length,
    syncing: syncJobs.filter((j) => j.status === 'syncing').length,
    completed: syncJobs.filter((j) => j.status === 'completed').length,
    failed: syncJobs.filter((j) => j.status === 'failed').length,
  };

  const handleCreateSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onTriggerNewSync(newTitle.trim(), parseFloat(newSize) || 60);
    setNewTitle('');
    setIsNewSyncModalOpen(false);
  };

  return (
    <div className="p-5 rounded-2xl bg-[#090e17]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Sync Manager Pipeline</h3>
          <p className="text-[11px] text-slate-400">
            Automated Google Drive ➔ Oracle Cloud NVMe ingestion pipeline
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewSyncModalOpen(!isNewSyncModalOpen)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-400/30 text-xs font-medium transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Queue Sync Job</span>
        </button>
      </div>

      {/* Quick Ingestion Form */}
      {isNewSyncModalOpen && (
        <form onSubmit={handleCreateSync} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
          <span className="text-xs font-semibold text-white">Queue Media from Google Drive Vault</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Gladiator II (2024) 4K UHD Atmos"
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
            />
            <input
              type="number"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="Size GB"
              className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium transition-colors"
            >
              Start Sync
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs: Queued, Syncing, Completed, Failed */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        {(['all', 'syncing', 'queued', 'completed', 'failed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5',
              filter === tab
                ? 'bg-white/[0.12] text-white border border-white/[0.2] shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
            )}
          >
            <span className="capitalize">{tab}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                filter === tab ? 'bg-sky-400 text-[#06080d]' : 'bg-white/[0.08] text-slate-300'
              )}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-2.5">
        {filteredJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            No sync jobs in this category.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all space-y-2"
            >
              {/* Top Row: Title, Status Badge, and Speed */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">{job.title}</span>
                    <span className="text-[10px] font-mono text-slate-500">via {job.source}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {job.transferredGb} GB of {job.fileSizeGb} GB ({job.progressPercent}%)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === 'syncing' && (
                    <span className="text-xs font-mono text-sky-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-sky-400" />
                      {job.speedMbps} Mbps
                    </span>
                  )}
                  {job.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => onRetryJob(job.id)}
                      className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-[10px] font-mono flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-semibold',
                      job.status === 'syncing' && 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                      job.status === 'queued' && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                      job.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                      job.status === 'failed' && 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    )}
                  >
                    {job.status}
                  </span>
                </div>
              </div>

              {/* Progress Bar for Syncing Jobs */}
              {job.status === 'syncing' && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-300 shadow-[0_0_8px_#38bdf8]"
                      style={{ width: `${job.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Active Ingestion</span>
                    <span>ETA: ~{Math.round(job.etaSeconds / 60)} min</span>
                  </div>
                </div>
              )}

              {/* Error Message for Failed Jobs */}
              {job.error && (
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-mono">
                  {job.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
