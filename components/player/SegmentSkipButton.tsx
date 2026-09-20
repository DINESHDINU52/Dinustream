'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaSegment, SkipBehavior } from '@/types/segments';
import { FastForward, Check, Sparkles, Settings2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentSkipButtonProps {
  segment: MediaSegment | null;
  onSkip: (segment: MediaSegment) => void;
  visible?: boolean;
  skipBehavior?: SkipBehavior;
  onUpdateBehavior?: (behavior: SkipBehavior) => void;
  autoSkipFeedback?: MediaSegment | null;
  onUndoAutoSkip?: () => void;
}

export const SegmentSkipButton: React.FC<SegmentSkipButtonProps> = ({
  segment,
  onSkip,
  visible = true,
  skipBehavior = 'ask',
  onUpdateBehavior,
  autoSkipFeedback,
  onUndoAutoSkip,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Derive theme glow and colors based on segment type
  const getSegmentTheme = (type?: string) => {
    switch (type) {
      case 'INTRO':
        return {
          border: 'border-amber-400/30 hover:border-amber-400/60',
          iconColor: 'text-amber-400',
          glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]',
          badgeBg: 'bg-amber-400/15 text-amber-300',
        };
      case 'RECAP':
        return {
          border: 'border-indigo-400/30 hover:border-indigo-400/60',
          iconColor: 'text-indigo-400',
          glow: 'hover:shadow-[0_0_20px_rgba(129,140,248,0.25)]',
          badgeBg: 'bg-indigo-400/15 text-indigo-300',
        };
      case 'OUTRO':
        return {
          border: 'border-sky-400/30 hover:border-sky-400/60',
          iconColor: 'text-sky-400',
          glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.25)]',
          badgeBg: 'bg-sky-400/15 text-sky-300',
        };
      case 'PREVIEW':
        return {
          border: 'border-emerald-400/30 hover:border-emerald-400/60',
          iconColor: 'text-emerald-400',
          glow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]',
          badgeBg: 'bg-emerald-400/15 text-emerald-300',
        };
      case 'COMMERCIAL':
        return {
          border: 'border-rose-400/30 hover:border-rose-400/60',
          iconColor: 'text-rose-400',
          glow: 'hover:shadow-[0_0_20px_rgba(251,113,133,0.25)]',
          badgeBg: 'bg-rose-400/15 text-rose-300',
        };
      default:
        return {
          border: 'border-white/25 hover:border-white/50',
          iconColor: 'text-sky-400',
          glow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
          badgeBg: 'bg-white/10 text-slate-300',
        };
    }
  };

  const theme = getSegmentTheme(segment?.type);

  return (
    <>
      {/* 1. Floating Skip Button for active segment */}
      <AnimatePresence>
        {visible && segment && (
          <motion.div
            key={`skip-${segment.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute bottom-28 right-6 sm:right-10 z-30 flex items-center gap-1.5"
          >
            {/* Primary Skip Action Button */}
            <button
              onClick={() => onSkip(segment)}
              id="media-segment-skip-button"
              aria-label={segment.buttonLabel}
              title={`${segment.buttonLabel} (Press S)`}
              className={cn(
                'group flex items-center gap-2.5 px-4 py-2.5 rounded-xl',
                'bg-[#080d17]/90 hover:bg-[#0f172a]/95 text-white',
                'border backdrop-blur-xl transition-all duration-200 shadow-2xl',
                theme.border,
                theme.glow
              )}
            >
              <FastForward
                className={cn('w-4 h-4 transition-transform group-hover:scale-110', theme.iconColor)}
              />

              <span className="text-xs sm:text-sm font-semibold tracking-wider font-sans">
                {segment.buttonLabel}
              </span>

              {/* Keyboard Shortcut Hint [S] */}
              <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/10 text-slate-300 group-hover:text-white border border-white/10">
                S
              </span>
            </button>

            {/* Quick Segment Settings Toggle */}
            {onUpdateBehavior && (
              <div className="relative">
                <button
                  onClick={() => setShowQuickMenu((prev) => !prev)}
                  aria-label="Skip settings"
                  title="Segment preferences"
                  className="p-2.5 rounded-xl bg-[#080d17]/90 hover:bg-[#0f172a]/95 text-slate-400 hover:text-white border border-white/15 backdrop-blur-xl shadow-xl transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>

                {showQuickMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 rounded-xl bg-[#090e17]/95 border border-white/20 shadow-2xl backdrop-blur-xl text-xs space-y-1 z-40">
                    <p className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-white/[0.08]">
                      Skip Preferences
                    </p>
                    {[
                      { id: 'auto', label: 'Auto Skip' },
                      { id: 'ask', label: 'Ask to Skip' },
                      { id: 'never', label: 'Never Skip' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onUpdateBehavior(opt.id as SkipBehavior);
                          setShowQuickMenu(false);
                        }}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors',
                          skipBehavior === opt.id
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <span>{opt.label}</span>
                        {skipBehavior === opt.id && <Check className="w-3 h-3 text-sky-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Feedback indicator when a segment is Auto-Skipped */}
      <AnimatePresence>
        {autoSkipFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-28 right-6 sm:right-10 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#080d17]/90 border border-sky-400/40 text-white shadow-2xl backdrop-blur-xl text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-slate-200">
              Auto-skipped <span className="font-semibold text-white">{autoSkipFeedback.type}</span>
            </span>

            {onUndoAutoSkip && (
              <button
                onClick={onUndoAutoSkip}
                className="ml-1.5 flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-sky-300 hover:text-white transition-colors"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
