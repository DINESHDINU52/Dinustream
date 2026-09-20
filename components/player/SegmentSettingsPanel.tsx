'use client';

import React from 'react';
import { SkipBehavior } from '@/types/segments';
import { Check, Sparkles, MessageSquare, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentSettingsPanelProps {
  skipBehavior: SkipBehavior;
  onSelectBehavior: (behavior: SkipBehavior) => void;
  className?: string;
}

export const SegmentSettingsPanel: React.FC<SegmentSettingsPanelProps> = ({
  skipBehavior,
  onSelectBehavior,
  className,
}) => {
  const options: { id: SkipBehavior; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'auto',
      title: 'Auto Skip',
      desc: 'Seamlessly jumps past intros, recaps and credits without interruption',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'ask',
      title: 'Ask to Skip',
      desc: 'Shows an elegant floating button when a segment starts (default)',
      icon: <MessageSquare className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      id: 'never',
      title: 'Never Skip',
      desc: 'Full cinematic presentation with zero skip prompts or interruptions',
      icon: <Ban className="w-3.5 h-3.5 text-rose-400" />,
    },
  ];

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Media Segments
        </span>
        <span className="text-[10px] font-mono text-sky-400 font-semibold">
          {skipBehavior.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 pt-1">
        {options.map((opt) => {
          const isSelected = skipBehavior === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectBehavior(opt.id)}
              className={cn(
                'w-full text-left p-2 rounded-lg border transition-all flex items-start justify-between gap-2',
                isSelected
                  ? 'bg-white/10 border-sky-500/40 text-white'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'
              )}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  {opt.icon}
                  <span className={isSelected ? 'text-white' : 'text-slate-300'}>{opt.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
              </div>

              {isSelected && (
                <div className="mt-0.5 p-0.5 rounded-full bg-sky-500/20 text-sky-400">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
