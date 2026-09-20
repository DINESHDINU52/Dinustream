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
      text: 'text-sm tracking-[0.22em]',
      sub: 'text-[8px] tracking-[0.3em]',
      dot: 'w-1 h-1',
    },
    md: {
      text: 'text-base sm:text-lg tracking-[0.24em]',
      sub: 'text-[9px] tracking-[0.32em]',
      dot: 'w-1.5 h-1.5',
    },
    lg: {
      text: 'text-xl sm:text-2xl tracking-[0.28em]',
      sub: 'text-[10px] tracking-[0.36em]',
      dot: 'w-2 h-2',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('inline-flex flex-col select-none group', className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-semibold uppercase text-white font-mono transition-colors duration-200 group-hover:text-slate-100',
            currentSize.text
          )}
        >
          DINU<span className="text-slate-400 font-light">STREAM</span>
        </span>
        <span
          className={cn(
            'rounded-full bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.4)] opacity-80',
            currentSize.dot
          )}
        />
      </div>
      <span
        className={cn(
          'uppercase text-slate-500 font-sans font-medium transition-colors duration-200 group-hover:text-slate-400',
          currentSize.sub
        )}
      >
        Private Cinema
      </span>
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="cinema-focus rounded-sm inline-block focus:outline-none" aria-label="DinuStream Home">
        {content}
      </Link>
    );
  }

  return content;
};
