'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnreadIndicatorProps {
  count: number;
  className?: string;
}

export function UnreadIndicator({ count, className = '' }: UnreadIndicatorProps) {
  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.8)] border border-[#0a101d] pointer-events-none ${className}`}
      >
        {count > 9 ? '9+' : count}
      </motion.span>
    </AnimatePresence>
  );
}
