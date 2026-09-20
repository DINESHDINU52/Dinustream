'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PresenceIndicatorProps {
  isOnline: boolean;
  isSynced?: boolean;
  latencyMs?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PresenceIndicator({
  isOnline,
  isSynced = true,
  latencyMs = 14,
  size = 'md',
  showLabel = true,
  className = '',
}: PresenceIndicatorProps) {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        {isOnline && (
          <motion.span
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute rounded-full ${
              isSynced ? 'bg-emerald-500' : 'bg-amber-400'
            } ${dotSizes[size]}`}
          />
        )}
        <span
          className={`relative rounded-full transition-colors duration-300 ${
            isOnline
              ? isSynced
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
              : 'bg-slate-600'
          } ${dotSizes[size]}`}
        />
      </div>

      {showLabel && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-tight">
          {isOnline ? (
            <>
              <span className="text-emerald-400 font-medium">
                {isSynced ? 'Synced' : 'Connecting'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{latencyMs}ms</span>
            </>
          ) : (
            <span className="text-slate-500">Offline</span>
          )}
        </div>
      )}
    </div>
  );
}
