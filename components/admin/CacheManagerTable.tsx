'use client';

import React, { useState } from 'react';
import { CachedMedia } from '@/types/admin';
import { Trash2, Check, Film, Tv, Music, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CacheManagerTableProps {
  cachedMedia: CachedMedia[];
  onRemoveFromCache: (id: string) => void;
}

export const CacheManagerTable: React.FC<CacheManagerTableProps> = ({
  cachedMedia,
  onRemoveFromCache,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [removedNotification, setRemovedNotification] = useState<string | null>(null);

  const handleConfirmDelete = (id: string, title: string) => {
    onRemoveFromCache(id);
    setConfirmDeleteId(null);
    setRemovedNotification(`Removed "${title}" from NVMe cache.`);
    setTimeout(() => {
      setRemovedNotification(null);
    }, 3500);
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie':
        return <Film className="w-3.5 h-3.5 text-sky-400" />;
      case 'series':
        return <Tv className="w-3.5 h-3.5 text-indigo-400" />;
      case 'music':
        return <Music className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Film className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const totalCachedSize = cachedMedia.reduce((sum, item) => sum + item.sizeGb, 0).toFixed(1);

  return (
    <div className="p-5 rounded-2xl bg-[#090e17]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/20 text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Active NVMe Cache</h3>
            <p className="text-[11px] text-slate-400">
              {cachedMedia.length} titles cached ({totalCachedSize} GB) ready for zero-buffer Atmos screening
            </p>
          </div>
        </div>

        {removedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{removedNotification}</span>
          </motion.div>
        )}
      </div>

      {/* Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3">Title / Media</th>
              <th className="py-2.5 px-3">Audio & Video</th>
              <th className="py-2.5 px-3">Cache Size</th>
              <th className="py-2.5 px-3">Cached Date</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {cachedMedia.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                  No media currently cached on Oracle NVMe.
                </td>
              </tr>
            ) : (
              cachedMedia.map((item) => {
                const isConfirming = confirmDeleteId === item.id;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Media Title & Thumbnail */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-9 h-12 rounded object-cover border border-white/10 shrink-0 bg-white/5"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = '0.3';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            {getMediaIcon(item.mediaType)}
                            <span className="font-semibold text-white tracking-tight">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block truncate max-w-xs mt-0.5">
                            {item.cacheLocation}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Audio & Video Format */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 mr-1">
                          {item.resolution}
                        </span>
                        <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-400/20">
                          {item.audioFormat}
                        </span>
                      </div>
                    </td>

                    {/* Cache Size */}
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {item.sizeGb} <span className="text-[10px] text-slate-500 font-normal">GB</span>
                    </td>

                    {/* Cached At & Last Accessed */}
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      <div>{item.cachedAt}</div>
                      <div className="text-[10px] text-slate-500">Used: {item.lastAccessed}</div>
                    </td>

                    {/* Action: Remove from Cache */}
                    <td className="py-3 px-3 text-right">
                      <AnimatePresence mode="wait">
                        {isConfirming ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(item.id, item.title)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-medium shadow-md transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 text-[11px] transition-colors"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="delete-btn"
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[11px] font-medium transition-all"
                            title="Remove from NVMe Cache"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
