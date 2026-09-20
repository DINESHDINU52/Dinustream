'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type CinemaBadgeVariant =
  | 'silver'
  | 'midnight'
  | 'atmos'
  | 'vision'
  | 'uhd'
  | 'sync'
  | 'rating'
  | 'dinu'
  | 'kanmani';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: CinemaBadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

const variantStyles: Record<CinemaBadgeVariant, string> = {
  silver:
    'bg-slate-300/[0.08] text-slate-300 border border-slate-300/[0.15]',
  midnight:
    'bg-[#121927] text-slate-200 border border-slate-500/[0.2]',
  atmos:
    'bg-[#0c121e]/90 text-slate-200 border border-slate-400/[0.22] font-semibold tracking-wider',
  vision:
    'bg-[#0c121e]/90 text-slate-200 border border-slate-400/[0.22] font-semibold tracking-wider',
  uhd:
    'bg-[#0c121e]/90 text-slate-300 border border-slate-400/[0.18]',
  sync:
    'bg-[#0c191c] text-emerald-300 border border-emerald-500/25',
  rating:
    'bg-black/50 text-slate-400 border border-slate-600/30 font-medium',
  dinu:
    'bg-[#0c1524] text-sky-300 border border-sky-500/30',
  kanmani:
    'bg-[#1c0c14] text-rose-300 border border-rose-500/30',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'silver',
  size = 'sm',
  children,
  icon,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center select-none font-mono uppercase rounded',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-0.5 gap-1.5',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
