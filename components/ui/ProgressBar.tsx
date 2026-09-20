'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  progress: number; // 0 - 100
  size?: 'xs' | 'sm' | 'md';
  variant?: 'silver' | 'accent' | 'subtle';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeStyles = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

const variantStyles = {
  silver: 'bg-gradient-to-r from-slate-400 to-slate-200',
  accent: 'bg-gradient-to-r from-sky-400 to-slate-200',
  subtle: 'bg-slate-400',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'sm',
  variant = 'silver',
  showLabel = false,
  label,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{label || 'Progress'}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className={cn(
          'relative w-full rounded-full bg-white/[0.08] overflow-hidden',
          sizeStyles[size]
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', variantStyles[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
