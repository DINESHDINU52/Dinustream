'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { QuickReactionEmoji } from '@/types/watchTogether';

interface QuickReactionBarProps {
  onReact: (emoji: QuickReactionEmoji) => void;
  className?: string;
}

const QUICK_EMOJIS: QuickReactionEmoji[] = ['❤️', '😂', '😭', '😱', '🔥', '👏'];

export function QuickReactionBar({ onReact, className = '' }: QuickReactionBarProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-full bg-[#080d17]/85 backdrop-blur-md border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.7)] ${className}`}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          whileHover={{ scale: 1.3, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onReact(emoji);
          }}
          className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-white/10 transition-colors"
          title={`React ${emoji}`}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}
