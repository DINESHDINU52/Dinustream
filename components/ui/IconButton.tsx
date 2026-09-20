'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  icon: React.ReactNode;
  label: string; // Accessible label required
  shape?: 'square' | 'rounded';
}

const variantStyles: Record<IconButtonVariant, string> = {
  primary:
    'bg-[#141d2e] hover:bg-[#1b273d] text-white border border-slate-400/[0.18] hover:border-slate-300/[0.3]',
  secondary:
    'bg-[#0d131f] hover:bg-[#141d2e] text-slate-300 hover:text-white border border-white/[0.08]',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-white border border-transparent',
  glass:
    'bg-[#0c121e]/70 hover:bg-[#131b2c]/80 text-slate-200 hover:text-white backdrop-blur-md border border-slate-400/[0.12]',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      shape = 'square',
      icon,
      label,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { y: 0, scale: 0.98 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center select-none cursor-pointer transition-colors duration-150',
          'cinema-focus focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          shape === 'rounded' ? 'rounded-full' : 'rounded-md',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';
