'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type GlassPanelVariant = 'standard' | 'subtle' | 'elevated' | 'interactive';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassPanelVariant;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/*
  Variants map onto the shared liquid-glass utilities in styles/cinema.css §4
  rather than each re-declaring its own tint, blur radius, border and shadow.
  Those hand-rolled stacks all used `backdrop-blur` with no `saturate()`, so the
  colour bleeding through from behind was desaturated — the reason every panel
  read as flat grey plastic instead of glass.
*/
const variantStyles: Record<GlassPanelVariant, string> = {
  standard: 'glass',
  subtle: 'glass-subtle',
  elevated: 'glass-strong glass-sheen',
  interactive:
    'glass hover:bg-white/[0.06] hover:border-white/[0.16] transition-colors duration-200 cursor-pointer',
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
