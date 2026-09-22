'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'poster' | 'avatar' | 'rect';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  className,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    card: 'aspect-[16/9] w-full rounded-xl',
    poster: 'aspect-[2/3] w-full rounded-xl',
    avatar: 'w-10 h-10 rounded-full',
    rect: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/[0.04] border border-white/[0.06]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.07] after:to-transparent',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
