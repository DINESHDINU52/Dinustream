'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  asLink = true,
}) => {
  const sizeMap = {
    sm: {
      text: 'text-base sm:text-lg tracking-[0.16em]',
      pill: 'text-[8px] tracking-[0.2em] px-1.5 py-0.5',
    },
    md: {
      text: 'text-lg sm:text-xl tracking-[0.18em]',
      pill: 'text-[9px] tracking-[0.22em] px-2 py-0.5',
    },
    lg: {
      text: 'text-xl sm:text-2xl tracking-[0.2em]',
      pill: 'text-[10px] tracking-[0.25em] px-2.5 py-0.5',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none group', className)}>
      <div className="flex items-center">
        <span className={cn('font-black uppercase font-sans text-white transition-opacity group-hover:opacity-90', currentSize.text)}>
          DINU<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">STREAM</span>
        </span>
      </div>
      <span className={cn('hidden sm:inline-flex items-center font-mono font-bold uppercase rounded-md bg-white/[0.06] text-cyan-300 border border-white/[0.08] shadow-sm', currentSize.pill)}>
        CINEMA
      </span>
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="cinema-focus rounded-lg inline-block focus:outline-none" aria-label="DinuStream Home">
        {content}
      </Link>
    );
  }

  return content;
};
