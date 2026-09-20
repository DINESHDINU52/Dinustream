'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GlassSurfaceVariant } from '@/types/design-system';

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassSurfaceVariant;
  children: React.ReactNode;
  glow?: 'gold' | 'dinu' | 'kanmani' | 'none';
}

const variantMap: Record<GlassSurfaceVariant, string> = {
  panel: 'bg-[#0b101a]/75 backdrop-blur-md border border-slate-400/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
  card: 'bg-[#0d1320]/60 backdrop-blur-sm border border-slate-300/[0.08] hover:border-slate-300/[0.2] transition-colors',
  navbar: 'bg-[#06080d]/85 backdrop-blur-xl border-b border-slate-400/[0.08]',
  modal: 'bg-[#0a0f18]/95 backdrop-blur-xl border border-slate-400/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.9)]',
  pill: 'bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md border border-white/10 transition-colors',
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
