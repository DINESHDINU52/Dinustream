'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CinemaButtonVariant =
  | 'primary'   // Midnight blue with subtle silver border
  | 'silver'    // Crisp platinum button with dark typography
  | 'secondary' // Subtle dark surface
  | 'ghost'     // Minimal transparent
  | 'danger';   // Muted crimson

export type CinemaButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: CinemaButtonVariant;
  size?: CinemaButtonSize;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<CinemaButtonVariant, string> = {
  primary:
    'bg-[#141d2e] hover:bg-[#1a263d] text-white border border-slate-400/[0.18] hover:border-slate-300/[0.35] shadow-[0_4px_16px_rgba(0,0,0,0.5)]',
  silver:
    'bg-[#f1f5f9] hover:bg-white text-[#090d16] font-semibold border border-transparent shadow-[0_4px_18px_rgba(255,255,255,0.12)]',
  secondary:
    'bg-[#0d131f]/90 hover:bg-[#141d2e] text-slate-200 border border-white/[0.08] hover:border-white/[0.18]',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white border border-transparent',
  danger:
    'bg-[#2d1117] hover:bg-[#3d1620] text-rose-200 border border-rose-500/25 hover:border-rose-500/40',
};

const sizeStyles: Record<CinemaButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-md gap-2 font-medium',
  lg: 'px-5 py-2.5 text-sm sm:text-base rounded-lg gap-2.5 font-medium',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      className,
      children,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { y: 0, scale: 0.99 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center select-none cursor-pointer transition-colors duration-150',
          'cinema-focus focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
