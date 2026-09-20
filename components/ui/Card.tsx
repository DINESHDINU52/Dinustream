'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardVariant } from '@/types/design-system';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: CardVariant;
  children: React.ReactNode;
  aspectRatio?: 'poster' | 'backdrop' | 'auto';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  aspectRatio = 'auto',
  interactive = true,
  children,
  className,
  ...props
}) => {
  const aspectClass =
    aspectRatio === 'poster'
      ? 'aspect-[2/3]'
      : aspectRatio === 'backdrop'
      ? 'aspect-[16/9]'
      : '';

  const variantStyles: Record<CardVariant, string> = {
    glass: 'bg-[#0d1320]/60 backdrop-blur-sm border border-slate-300/[0.08]',
    poster: 'bg-[#090e17] border border-slate-400/[0.1] shadow-[0_4px_18px_rgba(0,0,0,0.6)]',
    backdrop: 'bg-[#090e17] border border-slate-400/[0.1] shadow-[0_4px_18px_rgba(0,0,0,0.6)]',
    featured: 'bg-[#0d1421] border border-slate-400/[0.18] shadow-[0_8px_30px_rgba(0,0,0,0.7)]',
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={cn(
        'relative rounded-lg overflow-hidden border',
        variantStyles[variant] || variantStyles.glass,
        interactive &&
          'cursor-pointer hover:border-slate-300/[0.25] hover:shadow-[0_12px_32px_rgba(0,0,0,0.85)] cinema-focus',
        aspectClass,
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
