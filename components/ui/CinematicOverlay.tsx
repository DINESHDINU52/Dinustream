'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CinematicOverlayProps {
  type?: 'vignette' | 'heroBottomFade' | 'heroLeftGradient' | 'cardScrim' | 'spotlight';
  className?: string;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  type = 'heroBottomFade',
  className,
}) => {
  const overlayGradients = {
    vignette: 'radial-gradient(circle at center, transparent 35%, rgba(5,5,7,0.85) 100%)',
    heroBottomFade:
      'linear-gradient(to top, #050507 0%, rgba(5,5,7,0.92) 25%, rgba(5,5,7,0.5) 60%, transparent 100%)',
    heroLeftGradient:
      'linear-gradient(to right, #050507 0%, rgba(5,5,7,0.9) 35%, rgba(5,5,7,0.4) 65%, transparent 100%)',
    cardScrim:
      'linear-gradient(to top, rgba(5,5,7,0.95) 0%, rgba(5,5,7,0.5) 50%, transparent 100%)',
    spotlight: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%)',
  };

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 z-10 select-none', className)}
      style={{ backgroundImage: overlayGradients[type] }}
    />
  );
};
