'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const CINEMA_EMOJIS = [
  '🍿', '🎬', '🎧', '⚡', '✨', '🎥', '🍕', '🥂',
  '❤️', '🔥', '😂', '😱', '🥺', '👏', '🤯', '💯',
  '😍', '😭', '🙌', '😴', '👀', '🤫', '🤩', '🎉',
  '👍', '👌', '🤍', '🌙', '🌟', '💥', '🧨', '🍾',
];

export function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="p-3 rounded-2xl bg-[#0d1424]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.8)] w-64 z-50"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Cinema Reactions
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {CINEMA_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-7 h-7 flex items-center justify-center text-lg hover:scale-125 hover:bg-white/10 rounded-lg transition-all active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
