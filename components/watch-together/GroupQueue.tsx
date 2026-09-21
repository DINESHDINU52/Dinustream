'use client';

import { UserProfileId } from '@/types/cinema';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueuedMovie } from '@/types/watchTogether';
import { Button } from '@/components/ui/Button';
import {
  ListPlus,
  Trash2,
  Play,
  ChevronUp,
  ChevronDown,
  Crown,
  FastForward,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

interface GroupQueueProps {
  queue: QueuedMovie[];
  isHost?: boolean;
  currentUserId?: UserProfileId;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue?: (fromIndex: number, toIndex: number) => void;
  onPlayNext?: () => void;
  onPlayQueueItem: (movie: QueuedMovie) => void;
  onClearQueue?: () => void;
  onOpenSelector: () => void;
}

export function GroupQueue({
  queue,
  isHost = true,
  currentUserId = 'dinu',
  onRemoveFromQueue,
  onReorderQueue,
  onPlayNext,
  onPlayQueueItem,
  onClearQueue,
  onOpenSelector,
}: GroupQueueProps) {
  return (
    <div className="space-y-4">
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🍿</span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Movie Night Queue
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-mono font-semibold">
              {queue.length}
            </span>
            {isHost && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 text-[10px] font-mono">
                <Crown className="w-3 h-3 text-amber-400" />
                Host Controls
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Back-to-back synchronized cinema lineup for Dinu & Kanmani.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {queue.length > 0 && onPlayNext && (
            <Button
              variant="secondary"
              size="sm"
              icon={<FastForward className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={onPlayNext}
              title="Play next queued movie immediately"
              className="text-xs"
            >
              Play Next
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={<ListPlus className="w-3.5 h-3.5 text-sky-400" />}
            onClick={onOpenSelector}
            className="text-xs"
          >
            Add Movie
          </Button>

          {queue.length > 0 && isHost && onClearQueue && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />}
              onClick={onClearQueue}
              title="Clear entire queue"
              className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Queue List / Empty State */}
      {queue.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-white/10 bg-[#090e17] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-400/20 flex items-center justify-center mx-auto text-xl">
            🍿
          </div>
          <div>
            <p className="text-sm text-slate-200 font-semibold">Movie Night Queue is empty</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Add upcoming titles to seamlessly transition when the current movie ends.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenSelector}
            icon={<Sparkles className="w-3.5 h-3.5 text-sky-300" />}
            className="mt-1"
          >
            Browse Titles
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {queue.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === queue.length - 1;
              const isAddedByMe = item.addedBy === currentUserId;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-xl bg-[#0a0f19] border border-white/[0.08] flex items-center justify-between gap-3 group hover:border-sky-500/30 hover:bg-[#0c1322] transition-all shadow-sm"
                >
                  {/* Left: Index & Movie Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Position Number */}
                    <div className="flex flex-col items-center justify-center w-6 text-center flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-sky-400 transition-colors">
                        {index + 1}
                      </span>
                    </div>

                    {/* Movie Poster Thumbnail */}
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 relative border border-white/10 shadow-md">
                      <Image
                        src={item.posterUrl}
                        alt={item.title}
                        width={48}
                        height={64}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                          {item.title}
                        </h4>
                        {isFirst && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-semibold uppercase">
                            Up Next
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.runtime}
                      </p>

                      {/* Who Added This Movie Badge */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            item.addedBy === 'dinu'
                              ? 'bg-sky-950/70 border-sky-400/30 text-sky-300'
                              : 'bg-purple-950/70 border-purple-400/30 text-purple-300'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          Added by {item.addedByName || (item.addedBy === 'dinu' ? 'Dinu' : 'Kanmani')}
                          {isAddedByMe && ' (You)'}
                        </span>

                        {item.badges?.slice(0, 2).map((b) => (
                          <span
                            key={b}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Reorder & Item Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Reorder Up / Down */}
                    {onReorderQueue && (
                      <div className="flex flex-col gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => onReorderQueue(index, index - 1)}
                          disabled={isFirst}
                          title="Move Up"
                          aria-label="Move movie up in queue"
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorderQueue(index, index + 1)}
                          disabled={isLast}
                          title="Move Down"
                          aria-label="Move movie down in queue"
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Promote to Play Now */}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Play className="w-3.5 h-3.5 fill-current text-sky-400" />}
                      onClick={() => onPlayQueueItem(item)}
                      title="Play this movie now"
                      aria-label="Play this movie now"
                      className="hover:bg-sky-500/10 text-xs px-2.5"
                    >
                      Play
                    </Button>

                    {/* Remove from Queue */}
                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(item.id)}
                      title="Remove from queue"
                      aria-label={`Remove ${item.title} from queue`}
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
