'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingReactionEvent } from '@/types/watchTogether';

interface FloatingReactionOverlayProps {
  reactions: FloatingReactionEvent[];
}

export function FloatingReactionOverlay({ reactions }: FloatingReactionOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {reactions.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              opacity: 0,
              scale: 0.4,
              y: 60,
              x: `${item.xOffsetPercent || 50}vw`,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.4, 1.1, 0.9],
              y: -220,
              rotate: [0, -10, 10, -5],
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: 1.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute bottom-20 flex flex-col items-center gap-1 -translate-x-1/2"
          >
            {/* Reaction Emoji with Drop Glow */}
            <span className="text-4xl sm:text-5xl filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] select-none">
              {item.emoji}
            </span>

            {/* Sender Pill */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight shadow-md backdrop-blur-md border border-white/20 select-none ${
                item.senderId === 'dinu'
                  ? 'bg-sky-950/85 text-sky-300 border-sky-400/40'
                  : 'bg-purple-950/85 text-purple-300 border-purple-400/40'
              }`}
            >
              {item.senderName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
