'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  kicker,
  subtitle,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2', className)}>
      <div className="space-y-1">
        {kicker && (
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
            {kicker}
          </p>
        )}
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-400 font-light max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};
