'use client';

import React from 'react';
import { ChatReaction } from '@/types/chat';
import { Smile } from 'lucide-react';

interface ReactionBarProps {
  reactions: Record<string, ChatReaction>;
  currentUserId: 'dinu' | 'kanmani';
  onToggleReaction: (emoji: string) => void;
  onOpenEmojiPicker?: () => void;
  className?: string;
}

const QUICK_REACTIONS = ['❤️', '🍿', '🔥', '😂', '😱', '👏'];

export function ReactionBar({
  reactions,
  currentUserId,
  onToggleReaction,
  onOpenEmojiPicker,
  className = '',
}: ReactionBarProps) {
  const reactionEntries = Object.values(reactions || {}).filter((r) => r.count > 0);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Existing Reactions */}
      {reactionEntries.map((reaction) => {
        const hasReacted = reaction.users.includes(currentUserId);
        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onToggleReaction(reaction.emoji)}
            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all ${
              hasReacted
                ? 'bg-sky-500/25 border border-sky-400/50 text-white shadow-xs'
                : 'bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/10'
            }`}
          >
            <span>{reaction.emoji}</span>
            <span className="text-[10px] font-mono font-medium">{reaction.count}</span>
          </button>
        );
      })}

      {/* Quick Add Button */}
      {onOpenEmojiPicker && (
        <button
          type="button"
          onClick={onOpenEmojiPicker}
          title="Add reaction"
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface FloatingReactionMenuProps {
  onSelectReaction: (emoji: string) => void;
}

export function FloatingReactionMenu({ onSelectReaction }: FloatingReactionMenuProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-[#0a101d]/90 backdrop-blur-md border border-white/[0.12] shadow-lg">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelectReaction(emoji)}
          className="w-6 h-6 flex items-center justify-center text-sm hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
