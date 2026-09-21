'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GlassSurfaceVariant } from '@/types/design-system';

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassSurfaceVariant;
  children: React.ReactNode;
  glow?: 'gold' | 'dinu' | 'kanmani' | 'none';
}

/* Shared liquid-glass utilities from styles/cinema.css §4 — see GlassPanel for
   why the previous per-variant `backdrop-blur` stacks looked grey. */
const variantMap: Record<GlassSurfaceVariant, string> = {
  panel: 'glass',
  card: 'glass-subtle hover:border-white/[0.16] transition-colors',
  navbar: 'glass-strong glass-bar-bottom-edge rounded-none',
  modal: 'glass-strong glass-sheen',
  pill: 'glass-subtle hover:bg-white/[0.1] transition-colors',
};

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  variant = 'card',
  children,
  className,
  ...props
}) => {
  const glassStyle = variantMap[variant] || variantMap.card;

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200 relative',
        glassStyle,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
