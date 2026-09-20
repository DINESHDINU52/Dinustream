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
    card: 'aspect-[16/9] w-full rounded-lg',
    poster: 'aspect-[2/3] w-full rounded-lg',
    avatar: 'w-10 h-10 rounded-full',
    rect: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#0d1421] border border-white/[0.04]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
