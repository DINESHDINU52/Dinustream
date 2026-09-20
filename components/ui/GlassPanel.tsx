'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type GlassPanelVariant = 'standard' | 'subtle' | 'elevated' | 'interactive';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassPanelVariant;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles: Record<GlassPanelVariant, string> = {
  standard:
    'bg-[#0b101a]/75 backdrop-blur-md border border-slate-400/[0.1] shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
  subtle:
    'bg-[#080d15]/50 backdrop-blur-sm border border-slate-400/[0.07]',
  elevated:
    'bg-[#0d1320]/85 backdrop-blur-lg border border-slate-300/[0.14] shadow-[0_12px_40px_rgba(0,0,0,0.7)]',
  interactive:
    'bg-[#0b101a]/75 hover:bg-[#0f1624]/85 backdrop-blur-md border border-slate-400/[0.1] hover:border-slate-300/[0.22] shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-all duration-200 cursor-pointer',
};

const paddingStyles = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8 md:p-10',
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'standard',
  padding = 'md',
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl relative overflow-hidden transition-colors',
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
