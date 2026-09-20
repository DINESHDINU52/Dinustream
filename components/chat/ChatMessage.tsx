'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { ReactionBar, FloatingReactionMenu } from './ReactionBar';
import { EmojiPicker } from './EmojiPicker';
import { Reply } from 'lucide-react';
import Image from 'next/image';
import { isValidMediaUrl } from '@/lib/security/validation';

interface ChatMessageProps {
  message: ChatMessageType;
  currentUserId: 'dinu' | 'kanmani';
  onReply: (message: ChatMessageType) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export function ChatMessage({
  message,
  currentUserId,
  onReply,
  onToggleReaction,
}: ChatMessageProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentUser = message.senderId === currentUserId;
  const isDinu = message.senderId === 'dinu';

  const formatTimestamp = (epochMs: number) => {
    const d = new Date(epochMs);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowEmojiPicker(false);
      }}
      className={`relative group flex gap-2.5 px-3 py-2 rounded-xl transition-colors ${
        isHovered ? 'bg-white/[0.03]' : ''
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={`w-7 h-7 rounded-full overflow-hidden border ${
            isDinu ? 'border-sky-400/50 shadow-sky-500/20' : 'border-purple-400/50 shadow-purple-500/20'
          }`}
        >
          <Image
            src={message.senderAvatar || (isDinu ? '/avatars/dinu.png' : '/avatars/kanmani.png')}
            alt={message.senderName}
            width={28}
            height={28}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header: Sender & Timestamp */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold ${
              isDinu ? 'text-sky-300' : 'text-purple-300'
            }`}
          >
            {message.senderName}
            {isCurrentUser && (
              <span className="text-[10px] text-slate-500 font-mono ml-1 font-normal">
                (You)
              </span>
            )}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Replying Preview if available */}
        {message.replyTo && (
          <div className="p-1.5 rounded-md bg-white/[0.04] border-l-2 border-sky-400 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Reply className="w-3 h-3 text-sky-400 flex-shrink-0" />
            <span className="font-medium text-slate-300">
              {message.replyTo.senderName}:
            </span>
            <span className="truncate">{message.replyTo.text}</span>
          </div>
        )}

        {/* Text */}
        {message.text && (
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed break-words font-light">
            {message.text}
          </p>
        )}

        {/* GIF Attachment (Sanitized and strictly verified) */}
        {message.gifUrl && isValidMediaUrl(message.gifUrl) && (
          <div className="rounded-xl overflow-hidden border border-white/[0.1] max-w-xs mt-1.5 shadow-md">
            <Image
              src={message.gifUrl}
              alt="Reaction GIF"
              width={260}
              height={160}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Reactions Bar */}
        <ReactionBar
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
          onOpenEmojiPicker={() => setShowEmojiPicker((prev) => !prev)}
          className="mt-1"
        />

        {/* Popover Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <div className="absolute left-8 top-full mt-1 z-50">
              <EmojiPicker
                onSelectEmoji={(emoji) => {
                  onToggleReaction(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Menu (Reply, Quick Reactions on Hover) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1 right-2 flex items-center gap-1 z-20"
          >
            <FloatingReactionMenu
              onSelectReaction={(emoji) => onToggleReaction(message.id, emoji)}
            />

            <button
              type="button"
              onClick={() => onReply(message)}
              title="Reply"
              className="p-1.5 rounded-full bg-[#0a101d]/90 hover:bg-white/20 text-slate-300 hover:text-white border border-white/[0.12] transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
