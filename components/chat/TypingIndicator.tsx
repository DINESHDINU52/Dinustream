'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  isTyping: boolean;
  name: string;
}

export function TypingIndicator({ isTyping, name }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 font-mono"
    >
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
      </div>
      <span>{name} is typing...</span>
    </motion.div>
  );
}
